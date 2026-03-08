"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight } from "lucide-react";
import Link from "next/link";

type Broker = {
  id: string;
  name: string;
  ingestionDomain: string;
  isActive: boolean;
};

export default function BrokeragesDashboard() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);

  // Broker Creation State
  const [newBrokerName, setNewBrokerName] = useState("");
  const [newBrokerDomain, setNewBrokerDomain] = useState("");
  const [isCreatingBroker, setIsCreatingBroker] = useState(false);

  const fetchData = async () => {
    try {
      const resBrokers = await fetch("/api/brokers");
      if (resBrokers.ok) {
        const dataBrokers = await resBrokers.json();
        setBrokers(dataBrokers.brokers || []);
      }
    } catch (e) {
      console.error("Failed to fetch brokers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingBroker(true);
    try {
      const res = await fetch("/api/brokers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBrokerName,
          ingestionDomain: newBrokerDomain
        })
      });
      if (!res.ok) throw new Error(await res.text());

      await fetchData();
      setNewBrokerName("");
      setNewBrokerDomain("");
    } catch (e: any) {
      alert(e.message || "Failed to create broker.");
    } finally {
      setIsCreatingBroker(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Brokerage Tenants</h2>
        <p className="text-muted-foreground">Manage organization domains and database mapping.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register New Firm</CardTitle>
          <CardDescription>Initialize a new database tenant structure for a broker.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateBroker} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Name</label>
              <input
                required
                type="text"
                value={newBrokerName}
                onChange={e => setNewBrokerName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="e.g. J. Filley Insurance"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ingestion Domain</label>
              <input
                required
                type="text"
                value={newBrokerDomain}
                onChange={e => setNewBrokerDomain(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm"
                placeholder="wfains.com"
              />
            </div>
            <Button type="submit" disabled={isCreatingBroker} className="bg-slate-900 text-white h-10">
              {isCreatingBroker ? "Constructing..." : "Initialize Tenant"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Client Environments</CardTitle>
          <CardDescription>Scale 100+ brokerages and administer their lifecycles.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Syncing database rows...</p>
          ) : brokers.length > 0 ? (
            <div className="border rounded-md shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Firm Identity</th>
                    <th className="px-4 py-3 font-medium">Mapped Domain</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brokers.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">

                      <td className="px-4 py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {b.name}
                        </div>
                      </td>

                      <td className="px-4 py-4 font-mono text-xs text-slate-600">
                        {b.ingestionDomain}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <Badge variant={b.isActive ? 'default' : 'secondary'} className={b.isActive ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                          {b.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href={`/brokers/${b.id}`}>
                            <Button size="sm" variant="outline" className="flex gap-2 items-center">
                              Manage
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Building2 className="h-12 w-12 text-slate-200 mb-4" />
              <p>No brokerages have been initialized yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
