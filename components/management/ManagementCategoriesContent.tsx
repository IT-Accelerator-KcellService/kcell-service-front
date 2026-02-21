"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCategoryStore } from "@/stores/useCategoryStore";
import { createServiceCategory, deleteServiceCategory, getExecutorsByCategory } from "@/lib/api";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ManagementCategoriesContent() {
  const isMobile = !useMediaQuery("(min-width: 768px)");
  const { token } = useAuthStore();
  const { categories, fetchCategories, createSubcategory, deleteSubcategory } = useCategoryStore();
  const { toast } = useToast();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoriesWithExecutors, setCategoriesWithExecutors] = useState<Set<number>>(new Set());

  const [selectedCategoryForSubcategory, setSelectedCategoryForSubcategory] = useState<number | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<number | null>(null);
  const [isDeletingSubcategory, setIsDeletingSubcategory] = useState(false);
  const [subcategoryError, setSubcategoryError] = useState<string | null>(null);

  const checkCategoriesWithExecutors = useCallback(async () => {
    const categoriesWithExecs = new Set<number>();
    for (const category of categories) {
      try {
        const response = await getExecutorsByCategory(category.id);
        if (response.data && response.data.length > 0) {
          categoriesWithExecs.add(category.id);
        }
      } catch {
        // ignore
      }
    }
    setCategoriesWithExecutors(categoriesWithExecs);
  }, [categories]);

  useEffect(() => {
    if (categories.length > 0 && token) {
      checkCategoriesWithExecutors();
    }
  }, [categories, token, checkCategoriesWithExecutors]);

  useEffect(() => {
    if (token) {
      fetchCategories(token);
    }
  }, [token, fetchCategories]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !token) return;
    setIsCreatingCategory(true);
    setCategoryError(null);
    try {
      await createServiceCategory({ name: newCategoryName.trim() });
      toast({ title: "Категория создана", description: `Категория "${newCategoryName}" успешно создана` });
      setNewCategoryName("");
      fetchCategories(token);
    } catch (error: any) {
      setCategoryError(error.response?.data?.message || "Ошибка при создании категории");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete || !token) return;
    setIsDeletingCategory(true);
    setCategoryError(null);
    try {
      await deleteServiceCategory(categoryToDelete);
      toast({ title: "Категория удалена", description: "Категория успешно удалена" });
      setCategoryToDelete(null);
      fetchCategories(token);
      checkCategoriesWithExecutors();
    } catch (error: any) {
      setCategoryError(error.response?.data?.message || "Ошибка при удалении категории");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleCreateSubcategory = async () => {
    if (!selectedCategoryForSubcategory || !newSubcategoryName.trim() || !token) return;
    setIsCreatingSubcategory(true);
    setSubcategoryError(null);
    try {
      await createSubcategory(token, {
        name: newSubcategoryName.trim(),
        category_id: selectedCategoryForSubcategory,
      });
      toast({ title: "Подкатегория создана", description: `Подкатегория "${newSubcategoryName}" успешно создана` });
      setSelectedCategoryForSubcategory(null);
      setNewSubcategoryName("");
      fetchCategories(token);
    } catch (error: any) {
      setSubcategoryError((error as Error)?.message || "Ошибка при создании подкатегории");
    } finally {
      setIsCreatingSubcategory(false);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!subcategoryToDelete || !token) return;
    setIsDeletingSubcategory(true);
    setSubcategoryError(null);
    try {
      await deleteSubcategory(token, subcategoryToDelete);
      toast({ title: "Подкатегория удалена", description: "Подкатегория успешно удалена" });
      setSubcategoryToDelete(null);
      fetchCategories(token);
    } catch (error: any) {
      setSubcategoryError((error as Error)?.message || "Ошибка при удалении подкатегории");
    } finally {
      setIsDeletingSubcategory(false);
    }
  };

  const cardClass = isMobile ? "w-full bg-[#2C2C2E] border-[#3A3A3C]" : "w-full";
  const titleClass = isMobile ? "text-base text-white" : "text-base";
  const labelClass = isMobile ? "text-sm font-medium text-[#8E8E93]" : "text-sm font-medium";
  const inputClass = isMobile
    ? "flex-1 px-3 py-2 border border-[#3A3A3C] bg-[#1C1C1E] rounded-md focus:outline-none focus:ring-2 focus:ring-[#F35713] text-sm text-white placeholder:text-[#8E8E93]"
    : "flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#114A65] text-sm";
  const inputClassShort = isMobile
    ? "px-3 py-2 border border-[#3A3A3C] bg-[#1C1C1E] rounded-md focus:outline-none focus:ring-2 focus:ring-[#F35713] text-sm text-white placeholder:text-[#8E8E93]"
    : "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#114A65] text-sm";
  const warnBoxClass = isMobile
    ? "bg-amber-900/30 border border-amber-700 rounded-lg p-3 mb-2"
    : "bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2";
  const warnTextClass = isMobile ? "text-xs text-amber-200" : "text-xs text-yellow-800";
  const errorBoxClass = isMobile ? "bg-red-900/30 border border-red-700 rounded-lg p-3" : "bg-red-50 border border-red-200 rounded-lg p-3";
  const errorTextClass = isMobile ? "text-sm text-red-200" : "text-sm text-red-800";
  const tabsListClass = isMobile ? "grid w-full grid-cols-2 mb-4 bg-[#2C2C2E]" : "grid w-full grid-cols-2 mb-4";
  const tabsTriggerClass = isMobile ? "data-[state=active]:bg-[#F35713] data-[state=active]:text-white text-[#8E8E93]" : "";

  return (
    <Tabs defaultValue="categories" className="w-full">
      <TabsList className={tabsListClass}>
        <TabsTrigger value="categories" className={tabsTriggerClass}>Категории</TabsTrigger>
        <TabsTrigger value="subcategories" className={tabsTriggerClass}>Подкатегории</TabsTrigger>
      </TabsList>

      <TabsContent value="categories">
        <Card className={cardClass}>
          <CardHeader className="pb-3">
            <CardTitle className={titleClass}>Управление категориями</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className={labelClass}>Создать новую категорию</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Название категории"
                  className={inputClass}
                  disabled={isCreatingCategory}
                />
                <Button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || isCreatingCategory}
                  className="bg-[#F35713] hover:bg-[#E04D0F] text-white min-h-[40px] md:bg-green-600 md:hover:bg-green-700"
                >
                  {isCreatingCategory ? "..." : "Создать"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Удалить категорию</Label>
              <div className={warnBoxClass}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className={warnTextClass}>
                    <p className="font-medium mb-1">Внимание:</p>
                    <p>• Категорию можно удалить только если в ней нет исполнителей</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={categoryToDelete?.toString() || ""}
                  onValueChange={(v) => setCategoryToDelete(v ? parseInt(v) : null)}
                >
                  <SelectTrigger className={`flex-1 ${isMobile ? "bg-[#1C1C1E] border-[#3A3A3C] text-white" : ""}`}>
                    <SelectValue placeholder="Выберите категорию для удаления" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => {
                      const hasExecutors = categoriesWithExecutors.has(cat.id);
                      return (
                        <SelectItem
                          key={cat.id}
                          value={cat.id.toString()}
                          disabled={hasExecutors}
                        >
                          {cat.name} {hasExecutors && "(есть исполнители)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleDeleteCategory}
                  disabled={!categoryToDelete || isDeletingCategory || (categoryToDelete ? categoriesWithExecutors.has(categoryToDelete) : false)}
                  variant="destructive"
                  className="min-h-[40px]"
                >
                  {isDeletingCategory ? "..." : "Удалить"}
                </Button>
              </div>
            </div>
            {categoryError && (
              <div className={errorBoxClass}>
                <p className={errorTextClass}>{categoryError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="subcategories">
        <Card className={cardClass}>
          <CardHeader className="pb-3">
            <CardTitle className={titleClass}>Управление подкатегориями</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className={labelClass}>Создать новую подкатегорию</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select
                  value={selectedCategoryForSubcategory?.toString() || ""}
                  onValueChange={(v) => setSelectedCategoryForSubcategory(v ? parseInt(v) : null)}
                >
                  <SelectTrigger className={isMobile ? "bg-[#1C1C1E] border-[#3A3A3C] text-white" : ""}>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  type="text"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder="Название подкатегории"
                  className={inputClassShort}
                  disabled={isCreatingSubcategory}
                />
              </div>
              <Button
                onClick={handleCreateSubcategory}
                disabled={!selectedCategoryForSubcategory || !newSubcategoryName.trim() || isCreatingSubcategory}
                className="bg-[#F35713] hover:bg-[#E04D0F] text-white w-full min-h-[40px] md:bg-green-600 md:hover:bg-green-700"
              >
                {isCreatingSubcategory ? "..." : "Создать подкатегорию"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label className={labelClass}>Удалить подкатегорию</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={subcategoryToDelete?.toString() || ""}
                  onValueChange={(v) => setSubcategoryToDelete(v ? parseInt(v) : null)}
                >
                  <SelectTrigger className={`flex-1 ${isMobile ? "bg-[#1C1C1E] border-[#3A3A3C] text-white" : ""}`}>
                    <SelectValue placeholder="Выберите подкатегорию для удаления" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.flatMap((cat) =>
                      (cat.subcategories || []).map((sub) => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>
                          {cat.name} → {sub.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleDeleteSubcategory}
                  disabled={!subcategoryToDelete || isDeletingSubcategory}
                  variant="destructive"
                  className="min-h-[40px]"
                >
                  {isDeletingSubcategory ? "..." : "Удалить"}
                </Button>
              </div>
            </div>
            {subcategoryError && (
              <div className={errorBoxClass}>
                <p className={errorTextClass}>{subcategoryError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
