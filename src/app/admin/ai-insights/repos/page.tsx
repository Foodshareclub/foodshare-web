"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RepoConfig {
  id: string;
  full_name: string;
  enabled: boolean;
  auto_review: boolean;
  categories: string[];
  ignore_paths: string[];
  custom_instructions: string | null;
}

interface PrInfo {
  number: number;
  title: string;
  state: string;
  html_url: string;
}

export default function ReposPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<RepoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    full_name: string;
    enabled: boolean;
    auto_review: boolean;
    categories: string[];
    ignore_paths: string[];
    custom_instructions: string;
  }>({
    full_name: "",
    enabled: true,
    auto_review: true,
    categories: ["security", "bug", "performance"],
    ignore_paths: [],
    custom_instructions: "",
  });

  const loadConfigs = useCallback(() => {
    fetch("/api/admin/repos/config")
      .then((r) => r.json())
      .then((data) => {
        setConfigs(data.configs || []);
        setLoading(false);
      })
      .catch(() => {
        setConfigs([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleSave = async () => {
    if (!formData.full_name?.includes("/")) return;
    setLoading(true);
    const [owner, repo] = formData.full_name.split("/");
    try {
      const res = await fetch("/api/admin/repos/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        loadConfigs();
        setEditing(null);
        setFormData({
          full_name: "",
          enabled: true,
          auto_review: true,
          categories: ["security", "bug", "performance"],
          ignore_paths: [],
          custom_instructions: "",
        });
      } else {
        alert("Failed to save: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("Error saving repository configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fullName: string) => {
    if (!confirm(`Delete repository ${fullName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/repos/config?full_name=" + fullName, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        loadConfigs();
      } else {
        alert("Failed to delete: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("Error deleting repository");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500">Loading repositories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white text-base md:text-lg">Connected Repositories</CardTitle>
          <Button
            onClick={() => setEditing("new")}
            className="bg-emerald-600 hover:bg-emerald-700 px-3 md:px-4 text-sm"
          >
            + Connect Repository
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {configs.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p>No repositories connected</p>
              <p className="text-sm mt-2">Add a repo above to enable AI code reviews</p>
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <Card
                  key={config.id}
                  className="bg-zinc-800/50 border-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white truncate">{config.full_name.split("/")[1]}</span>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-sm ${config.enabled ? "border-emerald-500 text-emerald-400" : "border-zinc-600 text-zinc-400"}`}
                      >
                        {config.enabled ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-sm ${config.auto_review ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400"}`}
                      >
                        {config.auto_review ? "On" : "Off"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p className="text-zinc-400 mb-1">Focus Areas:</p>
                    <div className="flex flex-wrap gap-1">
                      {config.categories.map((cat: string) => (
                        <span
                          key={cat}
                          className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 text-xs"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                    <p className="text-zinc-400 mb-1">Ignore Paths:</p>
                    <div className="flex flex-wrap gap-1">
                      {config.ignore_paths.map((path: string) => (
                        <span
                          key={path}
                          className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 text-xs"
                        >
                          {path}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      {editing && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-base md:text-lg">Connect Repository</CardTitle>
            <Button
              onClick={() => setEditing(null)}
              className="bg-zinc-700 hover:bg-zinc-600 text-sm px-2 py-1"
            >
              Cancel
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-zinc-400 block mb-1">
                    Repository (owner/repo)
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="foodshare/foodshare-web"
                    disabled={loading}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 block mb-1">Auto-Review PRs</label>
                  <Select
                    onValueChange={(v) => setFormData({ ...formData, auto_review: v === "true" })}
                    disabled={loading}
                  >
                    <SelectValue>Enabled</SelectValue>
                    <SelectValue>Disabled</SelectValue>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1">Focus Areas</label>
                <Select
                  onValueChange={(v) =>
                    setFormData({ ...formData, categories: v.split(", ").filter(Boolean) })
                  }
                  disabled={loading}
                >
                  <SelectValue>Security</SelectValue>
                  <SelectValue>Bugs</SelectValue>
                  <SelectValue>Performance</SelectValue>
                  <SelectValue>Documentation</SelectValue>
                </Select>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1">
                  Ignore Paths (comma-separated)
                </label>
                <Input
                  value={
                    formData.ignore_paths
                      .join(", ")
                      ?.split(", ")
                      .filter((s: string) => s.length > 0)
                      .join(", ") || ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ignore_paths: e.target.value.split(",").filter((s: string) => s.length > 0),
                    })
                  }
                  placeholder="e.g. docs/, tests/"
                  disabled={loading}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1">Custom Instructions</label>
                <Input
                  value={formData.custom_instructions || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, custom_instructions: e.target.value })
                  }
                  placeholder="e.g. Focus on security vulnerabilities and performance bottlenecks"
                  disabled={loading}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Configuration"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={loading}
                  className="bg-zinc-700 hover:bg-zinc-600 text-sm px-3 py-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
