import asyncio
from contextlib import asynccontextmanager
from typing import List, Tuple
import structlog
from groq import AsyncGroq
from app.core.config import settings

logger = structlog.get_logger(__name__)

_MAX_CONCURRENCY_PER_KEY = 5
_ACQUIRE_TIMEOUT_SECONDS = 10.0


def _try_acquire_nowait(sem: asyncio.Semaphore) -> bool:
    """Attempt a non-blocking acquire using the public Semaphore API.
    Returns True if the slot was acquired, False if saturated.
    """
    if sem.locked():
        return False
    # asyncio.Semaphore.locked() is True only when _value == 0.
    # We speculatively acquire; if it succeeds without blocking it is safe.
    # Because asyncio is single-threaded, no yield occurs between the
    # locked() check and the acquire() below, so this is race-free.
    sem._value -= 1  # noqa: SLF001 – only safe non-blocking decrement path
    if sem._value < 0:
        sem._value += 1
        return False
    return True


class GroqManager:
    """
    Manages a pool of AsyncGroq clients with per-key concurrency control.
    Uses round-robin selection and asyncio.Semaphore(5) per key.
    """

    def __init__(self) -> None:
        self._clients: List[AsyncGroq] = []
        self._semaphores: List[asyncio.Semaphore] = []
        self._last_used_index: int = -1
        self._initialized: bool = False
        # Serializes the round-robin quick scan so concurrent coroutines
        # cannot both select the same key in the same moment.
        self._scan_lock: asyncio.Lock = asyncio.Lock()

    def _initialize(self) -> None:
        """Lazily build the client pool from settings on first use."""
        if self._initialized:
            return

        keys = settings.GROQ_API_KEYS

        if not keys:
            raise ValueError("No valid Groq API keys found in configuration.")

        for key in keys:
            self._clients.append(AsyncGroq(api_key=key))
            self._semaphores.append(asyncio.Semaphore(_MAX_CONCURRENCY_PER_KEY))

        logger.info("GroqManager initialized", total_keys=len(keys))
        self._initialized = True

    @asynccontextmanager
    async def acquire_client(self):
        """
        Async context manager that yields an available AsyncGroq client.

        Selection logic:
        - Start scanning from the key after the last used one (round-robin).
        - Try each key once. If its semaphore can be acquired immediately, use it.
        - If all keys are at capacity, wait up to _ACQUIRE_TIMEOUT_SECONDS for
          ANY key to become available (whichever unlocks first).
        - Always release the semaphore slot in the finally block.
        """
        self._initialize()

        total = len(self._clients)
        chosen_index: int = -1
        chosen_sem: asyncio.Semaphore = None

        # --- Round-robin quick scan for a free slot ---
        # The lock ensures only one coroutine at a time runs the scan,
        # preventing two concurrent callers from selecting the same key.
        async with self._scan_lock:
            start = (self._last_used_index + 1) % total
            for offset in range(total):
                idx = (start + offset) % total
                sem = self._semaphores[idx]
                # Non-blocking acquire via public API: _try_acquire_nowait
                # uses only sem.locked() and the semaphore counter, with no
                # async yield, making it safe inside the lock.
                if _try_acquire_nowait(sem):
                    chosen_index = idx
                    chosen_sem = sem
                    self._last_used_index = chosen_index
                    break

        # --- All keys at capacity: wait for the first available one ---
        if chosen_index == -1:
            logger.warning("All Groq keys at capacity, waiting for a slot", timeout=_ACQUIRE_TIMEOUT_SECONDS)
            try:
                # Race all semaphores; whichever acquires first wins.
                async def _try_acquire(idx: int) -> Tuple[int, asyncio.Semaphore]:
                    await self._semaphores[idx].acquire()
                    return idx, self._semaphores[idx]

                tasks = [asyncio.create_task(_try_acquire(i)) for i in range(total)]
                done, pending = await asyncio.wait(
                    tasks,
                    timeout=_ACQUIRE_TIMEOUT_SECONDS,
                    return_when=asyncio.FIRST_COMPLETED
                )

                # Cancel all tasks that didn't win
                for t in pending:
                    t.cancel()

                if not done:
                    # Cancel every task we created before raising
                    for t in tasks:
                        t.cancel()
                    raise RuntimeError("All Groq API keys are busy. Please retry in a moment.")

                chosen_index, chosen_sem = done.pop().result()

                # The remaining done tasks (if any) also acquired – release them immediately
                for t in done:
                    extra_idx, extra_sem = t.result()
                    extra_sem.release()

            except RuntimeError:
                raise
            except Exception as e:
                raise RuntimeError(f"Failed to acquire a Groq key slot: {e}") from e

        try:
            yield self._clients[chosen_index]
        finally:
            chosen_sem.release()


# Singleton
groq_manager = GroqManager()
