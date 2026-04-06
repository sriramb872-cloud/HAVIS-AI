import { Card, CardContent } from "@/components/ui/card";
import { Users, History, ShieldCheck } from "lucide-react";

interface AdminOverview {
  total_users: number;
  total_history_items: number;
  total_admins: number;
}

export const AdminStats = ({ stats }: { stats: AdminOverview }) => {
  const cards = [
    {
      label: "Total Users",
      value: stats.total_users,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total History Items",
      value: stats.total_history_items,
      icon: History,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Total Admins",
      value: stats.total_admins,
      icon: ShieldCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="glass-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <h2 className="text-3xl font-bold tracking-tight mt-1">{card.value}</h2>
              </div>
              <div className={`p-3 rounded-xl ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
