import {
  BookOpen,
  FileText,
  MessageSquare,
  Podcast,
  Search,
  CheckSquare,
  BarChart3,
  Brain,
  Mic,
  Bot,
  CalendarDays,
  Briefcase,
  Database,
  LogOut,
  Settings,
  ChevronRight,
} from "lucide-react";
import logo from "../assets/logo-transparent.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Palette, Moon, Sparkles, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";

const coreItems = [
  { title: "Smart Notes", url: "/notes", icon: BookOpen },
  { title: "Study Planner", url: "/study-planner", icon: CalendarDays },
  { title: "Interview Prep", url: "/interview", icon: MessageSquare },
  { title: "Mock Interview", url: "/mock-interview", icon: Mic },
  { title: "Resume Analyzer", url: "/resume", icon: FileText },
  { title: "AI Podcast", url: "/podcast", icon: Podcast },
  { title: "Resource Finder", url: "/resources", icon: Search },
  { title: "Task Manager", url: "/tasks", icon: CheckSquare },
  { title: "Test Dashboard", url: "/tests", icon: BarChart3 },
  { title: "AI Search", url: "/ai-search", icon: Bot },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();

  const renderGroup = (items: typeof coreItems, label: string) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.url}
                tooltip={item.title}
              >
                <NavLink
                  to={item.url}
                  end
                  className="hover:bg-sidebar-accent/60"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <NavLink to="/" className="flex items-center gap-2.5 no-underline">
          <div className="flex h-9 w-9 items-center justify-center shrink-0">
            <img 
              src={logo} 
              alt="HAVIS AI Logo" 
              className="h-full w-full object-contain mix-blend-screen brightness-110 drop-shadow-md transition-opacity hover:opacity-90"
            />
          </div>
          {!collapsed && (
            <span className="font-heading text-lg font-bold text-sidebar-accent-foreground tracking-tight">
              HAVIS AI
            </span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup(coreItems, "Tools")}
      </SidebarContent>

      <SidebarFooter className="p-3 mt-auto border-t border-sidebar-border bg-sidebar-background/80 backdrop-blur-sm z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={`flex items-center ${collapsed ? 'justify-center mx-auto w-10 h-10' : 'gap-3 px-3 py-2 w-full'} rounded-lg hover:bg-sidebar-accent/50 cursor-pointer transition-colors border border-transparent hover:border-sidebar-border group`}>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm">
                <Settings className="h-4 w-4" />
              </div>
              {!collapsed && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/60 leading-none mb-1">Configuration</span>
                  <span className="text-sm font-medium text-sidebar-foreground capitalize leading-none">
                    {theme === "girls" ? "Elegant" : theme === "boys" ? "Classic" : "Dark"} Settings
                  </span>
                </div>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-56 mb-2 bg-popover/95 backdrop-blur-xl border-border/30 shadow-2xl rounded-xl p-1.5">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer flex gap-3 p-2.5 items-center hover:bg-primary/5 transition-colors group rounded-lg focus:bg-primary/5 outline-none data-[state=open]:bg-primary/5">
                <div className="flex h-7 w-7 bg-primary/10 group-hover:bg-primary/20 rounded-full items-center justify-center shrink-0 transition-colors">
                  <Palette className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="font-semibold text-[13px] tracking-tight">Aesthetics</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-48 bg-popover/95 backdrop-blur-xl border-border/30 shadow-2xl rounded-xl p-1.5 ml-1">
                  <DropdownMenuItem onClick={() => setTheme("girls")} className="cursor-pointer flex gap-3 p-2.5 items-center hover:bg-primary/5 transition-colors group rounded-lg focus:bg-primary/5 outline-none">
                    <div className="flex h-7 w-7 bg-primary/10 group-hover:bg-primary/20 rounded-full items-center justify-center shrink-0 transition-colors">
                      <Sparkles className="h-3.5 w-3.5 text-[#A76D6D]" />
                    </div>
                    <span className="font-semibold text-[13px] tracking-tight">Elegant Mode</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setTheme("boys")} className="cursor-pointer flex gap-3 p-2.5 items-center hover:bg-primary/5 transition-colors group rounded-lg focus:bg-primary/5 outline-none">
                    <div className="flex h-7 w-7 bg-primary/10 group-hover:bg-primary/20 rounded-full items-center justify-center shrink-0 transition-colors">
                      <Sun className="h-3.5 w-3.5 text-[#D89A5B]" />
                    </div>
                    <span className="font-semibold text-[13px] tracking-tight">Classic Mode</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer flex gap-3 p-2.5 items-center hover:bg-primary/5 transition-colors group rounded-lg focus:bg-primary/5 outline-none border-t border-border/40 mt-1 pt-2.5">
                    <div className="flex h-7 w-7 bg-primary/10 group-hover:bg-primary/20 rounded-full items-center justify-center shrink-0 transition-colors">
                      <Moon className="h-3.5 w-3.5 opacity-80" />
                    </div>
                    <span className="font-semibold text-[13px] tracking-tight">Dark Mode</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSeparator className="bg-border/40 my-1.5" />

            <DropdownMenuItem onClick={logout} className="cursor-pointer flex gap-3 p-2.5 items-center hover:bg-destructive/10 transition-colors group text-destructive rounded-lg focus:bg-destructive/10 outline-none">
              <div className="flex h-7 w-7 bg-destructive/10 group-hover:bg-destructive/20 rounded-full items-center justify-center shrink-0 transition-colors">
                <LogOut className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-[13px] tracking-tight">Logout Platform</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
