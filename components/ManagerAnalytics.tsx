"use client"

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Clock, Star, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import api from "@/lib/api";
import { useMediaQuery } from "@/hooks/use-media-query";

interface SLAStats {
  byDate: Array<{
    date: string;
    avgHours: string;
    totalCompleted: number;
  }>;
  byCategory: Array<{
    categoryId: number;
    avgHours: string;
    totalCompleted: number;
  }>;
  byOffice: Array<{
    officeId: number;
    avgHours: string;
    totalCompleted: number;
  }>;
}

interface RatingStats {
  byOffice: Array<{
    officeId: number;
    avgRating: string;
    totalRatings: number;
    lowRatings: number;
  }>;
  byCategory: Array<{
    categoryId: number;
    avgRating: string;
    totalRatings: number;
    lowRatings: number;
  }>;
  byExecutor: Array<{
    executorId: number;
    avgRating: string;
    totalRatings: number;
    lowRatings: number;
  }>;
  byClient: Array<{
    clientId: number;
    avgRating: string;
    totalRatings: number;
    lowRatings: number;
  }>;
  byDate: Array<{
    date: string;
    avgRating: string;
    totalRatings: number;
    lowRatings: number;
  }>;
}

interface DetailedStats {
  byCategory: Array<{
    categoryId: number;
    totalRequests: number;
    completedRequests: number;
    newRequests: number;
    inWorkRequests: number;
  }>;
  byDirection: Array<{
    directionId: number;
    totalRequests: number;
    completedRequests: number;
    newRequests: number;
    inWorkRequests: number;
  }>;
  byExecutor: Array<{
    executorId: number;
    totalAssigned: number;
    completedRequests: number;
    inWorkRequests: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ManagerAnalytics() {
  const [slaStats, setSlaStats] = useState<SLAStats | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sla");
  const [categories, setCategories] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [executors, setExecutors] = useState<any[]>([]);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [slaRes, ratingRes, detailedRes, categoriesRes, officesRes, executorsRes] = await Promise.all([
        api.get("/analytics/stats/manager/sla"),
        api.get("/analytics/stats/manager/ratings"),
        api.get("/analytics/stats/manager/detailed"),
        api.get("/service-categories"),
        api.get("/offices"),
        api.get("/executors/all")
      ]);

      console.log("Загруженные данные:", {
        categories: categoriesRes.data,
        offices: officesRes.data,
        executors: executorsRes.data,
        detailedStats: detailedRes.data
      });

      // Детальное логирование для отладки
      console.log("Категории:", categoriesRes.data);
      console.log("Офисы:", officesRes.data);
      console.log("Исполнители:", executorsRes.data);
      console.log("Детальная статистика:", detailedRes.data);
      
      if (detailedRes.data?.byCategory) {
        console.log("Категории в статистике:", detailedRes.data.byCategory);
        detailedRes.data.byCategory.forEach((item: any) => {
          console.log(`Категория ID ${item.categoryId}:`, item);
        });
      }
      
      if (detailedRes.data?.byExecutor) {
        console.log("Исполнители в статистике:", detailedRes.data.byExecutor);
        detailedRes.data.byExecutor.forEach((item: any) => {
          console.log(`Исполнитель ID ${item.executorId}:`, item);
        });
      }

      setSlaStats(slaRes.data);
      setRatingStats(ratingRes.data);
      setDetailedStats(detailedRes.data);
      setCategories(categoriesRes.data);
      setOffices(officesRes.data);
      setExecutors(executorsRes.data);
    } catch (error) {
      console.error("Ошибка при загрузке аналитики:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, delta, positive = true, bg }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    delta?: string;
    positive?: boolean;
    bg: string;
  }) => (
    <Card className="min-w-0">
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>{icon}</div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm text-gray-600 truncate">{title}</p>
            <p className="text-xl font-bold truncate">{value}</p>
            {delta && (
              <div className="flex items-center text-xs mt-1">
                {positive ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                )}
                <span className={positive ? "text-green-600" : "text-red-600"}>{delta}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const getCategoryName = (categoryId: number) => {
    if (!categories.length) return `Категория ${categoryId}`;
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : `Категория ${categoryId}`;
  };

  const getOfficeName = (officeId: number) => {
    if (!offices.length) return `Офис ${officeId}`;
    const office = offices.find(off => off.id === officeId);
    return office ? office.name : `Офис ${officeId}`;
  };

  const getExecutorName = (executorId: number) => {
    if (!executors.length) return `Исполнитель ${executorId}`;
    const executor = executors.find(exec => exec.id === executorId);
    return executor ? (executor.user?.full_name || `Исполнитель ${executorId}`) : `Исполнитель ${executorId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка аналитики...</div>
      </div>
    );
  }

  // Проверяем, загружены ли все необходимые данные
  const isDataReady = categories.length > 0 && offices.length > 0 && executors.length > 0;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="w-full mb-3">
          <div className="overflow-x-auto">
            <TabsList className={`${isDesktop ? 'grid grid-cols-3 w-full' : 'flex w-max min-w-full'}`}>
              <TabsTrigger value="sla" className={`${isDesktop ? '' : 'text-xs px-2 whitespace-nowrap flex-shrink-0'}`}>
                SLA
              </TabsTrigger>
              <TabsTrigger value="ratings" className={`${isDesktop ? '' : 'text-xs px-2 whitespace-nowrap flex-shrink-0'}`}>
                Оценки
              </TabsTrigger>
              <TabsTrigger value="detailed" className={`${isDesktop ? '' : 'text-xs px-2 whitespace-nowrap flex-shrink-0'}`}>
                Детальная статистика
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="sla" className="space-y-6">
          <div className={`grid gap-4 ${isDesktop ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
            <StatCard
              title="Среднее время выполнения"
              value={slaStats?.byDate.length ? `${parseFloat(slaStats.byDate[slaStats.byDate.length - 1]?.avgHours || "0").toFixed(1)}ч` : "0ч"}
              icon={<Clock className="w-4 h-4 text-blue-600" />}
              bg="bg-blue-100"
            />
            <StatCard
              title="Всего завершено"
              value={slaStats?.byDate.reduce((sum, item) => sum + item.totalCompleted, 0) || 0}
              icon={<BarChart3 className="w-4 h-4 text-green-600" />}
              bg="bg-green-100"
            />
            <StatCard
              title="Категорий"
              value={slaStats?.byCategory.length || 0}
              icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
              bg="bg-orange-100"
            />
          </div>

          <div className={`grid gap-6 ${isDesktop ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            <Card>
              <CardHeader>
                <CardTitle className={isDesktop ? '' : 'text-lg'}>Динамика SLA по времени</CardTitle>
                <CardDescription className={isDesktop ? '' : 'text-sm'}>Среднее время выполнения заявок по дням</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={isDesktop ? 'h-64' : 'h-48'}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={slaStats?.byDate || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="avgHours" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className={isDesktop ? '' : 'text-lg'}>SLA по категориям</CardTitle>
                <CardDescription className={isDesktop ? '' : 'text-sm'}>Среднее время выполнения по категориям заявок</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={isDesktop ? 'h-64' : 'h-48'}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={slaStats?.byCategory.map(item => ({
                      ...item,
                      categoryName: getCategoryName(item.categoryId)
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="categoryName" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'avgHours' ? 'Средние часы' : name]} />
                      <Bar dataKey="avgHours" fill="#8884d8" name="Средние часы" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ratings" className="space-y-6">
          <div className={`grid gap-4 ${isDesktop ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-2'}`}>
            <StatCard
              title="Средняя оценка"
              value={ratingStats?.byDate.length ? ratingStats.byDate[ratingStats.byDate.length - 1]?.avgRating || "0" : "0"}
              icon={<Star className="w-4 h-4 text-yellow-600" />}
              bg="bg-yellow-100"
            />
            <StatCard
              title="Всего оценок"
              value={ratingStats?.byDate.reduce((sum, item) => sum + item.totalRatings, 0) || 0}
              icon={<BarChart3 className="w-4 h-4 text-blue-600" />}
              bg="bg-blue-100"
            />
            <StatCard
              title="Низкие оценки (1-2)"
              value={ratingStats?.byDate.reduce((sum, item) => sum + item.lowRatings, 0) || 0}
              icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
              bg="bg-red-100"
            />
            <StatCard
              title="Офисов"
              value={ratingStats?.byOffice.length || 0}
              icon={<BarChart3 className="w-4 h-4 text-green-600" />}
              bg="bg-green-100"
            />
          </div>

          <div className={`grid gap-6 ${isDesktop ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            <Card>
              <CardHeader>
                <CardTitle className={isDesktop ? '' : 'text-lg'}>Динамика оценок</CardTitle>
                <CardDescription className={isDesktop ? '' : 'text-sm'}>Средние оценки по времени</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={isDesktop ? 'h-64' : 'h-48'}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ratingStats?.byDate || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="avgRating" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className={isDesktop ? '' : 'text-lg'}>Низкие оценки по офисам</CardTitle>
                <CardDescription className={isDesktop ? '' : 'text-sm'}>Количество оценок 1-2 по офисам</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={isDesktop ? 'h-64' : 'h-48'}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ratingStats?.byOffice.map(item => ({
                      ...item,
                      officeName: isDataReady ? getOfficeName(item.officeId) : `Офис ${item.officeId}`
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="officeName" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'lowRatings' ? 'Низкие оценки' : name]} />
                      <Bar dataKey="lowRatings" fill="#ff6b6b" name="Низкие оценки" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className={isDesktop ? '' : 'text-lg'}>Оценки по категориям</CardTitle>
              <CardDescription className={isDesktop ? '' : 'text-sm'}>Средние оценки и количество низких оценок</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${isDesktop ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {!isDataReady && (
                  <div className="col-span-full text-center text-gray-500 py-4">
                    Загрузка данных...
                  </div>
                )}
                {ratingStats?.byCategory.map((item, index) => (
                  <div key={item.categoryId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${isDesktop ? '' : 'text-sm'}`}>
                        {isDataReady ? getCategoryName(item.categoryId) : `Категория ${item.categoryId}`}
                      </span>
                      <Badge variant="outline" className={isDesktop ? '' : 'text-xs'}>{item.avgRating}</Badge>
                    </div>
                    <div className={`text-gray-600 ${isDesktop ? 'text-sm' : 'text-xs'}`}>
                      <div>Всего оценок: {item.totalRatings}</div>
                      <div className="text-red-600">Низких оценок: {item.lowRatings}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <div className={`grid gap-4 ${isDesktop ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
            <StatCard
              title="Категорий"
              value={detailedStats?.byCategory.length || 0}
              icon={<BarChart3 className="w-4 h-4 text-blue-600" />}
              bg="bg-blue-100"
            />
            <StatCard
              title="Направлений"
              value={detailedStats?.byDirection.length || 0}
              icon={<BarChart3 className="w-4 h-4 text-green-600" />}
              bg="bg-green-100"
            />
            <StatCard
              title="Исполнителей"
              value={detailedStats?.byExecutor.length || 0}
              icon={<BarChart3 className="w-4 h-4 text-purple-600" />}
              bg="bg-purple-100"
            />
          </div>

          <div className={`grid gap-6 ${isDesktop ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            <Card>
              <CardHeader>
                <CardTitle className={isDesktop ? '' : 'text-lg'}>Статистика по категориям</CardTitle>
                <CardDescription className={isDesktop ? '' : 'text-sm'}>Распределение заявок по категориям</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={isDesktop ? 'h-64' : 'h-48'}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={detailedStats?.byCategory.map(item => ({
                          ...item,
                          categoryName: isDataReady ? getCategoryName(item.categoryId) : `Категория ${item.categoryId}`
                        })) || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ categoryName, totalRequests }) => `${categoryName}: ${totalRequests}`}
                        outerRadius={isDesktop ? 80 : 60}
                        fill="#8884d8"
                        dataKey="totalRequests"
                      >
                        {(detailedStats?.byCategory || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className={isDesktop ? '' : 'text-lg'}>Статистика по исполнителям</CardTitle>
                <CardDescription className={isDesktop ? '' : 'text-sm'}>Количество назначенных и завершенных заявок</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={isDesktop ? 'h-64' : 'h-48'}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detailedStats?.byExecutor.map(item => ({
                      ...item,
                      executorName: isDataReady ? getExecutorName(item.executorId) : `Исполнитель ${item.executorId}`
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="executorName" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [
                        value, 
                        name === 'totalAssigned' ? 'Назначено' : 
                        name === 'completedRequests' ? 'Завершено' : name
                      ]} />
                      <Bar dataKey="totalAssigned" fill="#8884d8" name="Назначено" />
                      <Bar dataKey="completedRequests" fill="#82ca9d" name="Завершено" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className={isDesktop ? '' : 'text-lg'}>Детальная статистика по категориям</CardTitle>
              <CardDescription className={isDesktop ? '' : 'text-sm'}>Полная информация по каждой категории</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${isDesktop ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {!isDataReady && (
                  <div className="col-span-full text-center text-gray-500 py-4">
                    Загрузка данных...
                  </div>
                )}
                {detailedStats?.byCategory.map((item) => (
                  <div key={item.categoryId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${isDesktop ? '' : 'text-sm'}`}>
                        {isDataReady ? getCategoryName(item.categoryId) : `Категория ${item.categoryId}`}
                      </span>
                      <Badge variant="outline" className={isDesktop ? '' : 'text-xs'}>{item.totalRequests}</Badge>
                    </div>
                    <div className={`text-gray-600 space-y-1 ${isDesktop ? 'text-sm' : 'text-xs'}`}>
                      <div>Завершено: {item.completedRequests}</div>
                      <div>Новые: {item.newRequests}</div>
                      <div>В работе: {item.inWorkRequests}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
