'use client';

import { useState, useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Category, getCategoryColor } from '@/lib/data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryForm } from './category-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function CategoriesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null
  );

  const categoriesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'categories')) : null),
    [firestore]
  );
  const { data: categories, isLoading } = useCollection<Category>(categoriesQuery);

  const parentCategories = useMemo(
    () => categories?.filter(c => !c.parentId) || [],
    [categories]
  );

  const subCategories = useMemo(
    () => categories?.filter(c => !!c.parentId) || [],
    [categories]
  );

  const handleOpenForm = (category: Category | null) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingCategory(null);
    setIsFormOpen(false);
  };

  const confirmDelete = (categoryId: string) => {
    setDeletingCategoryId(categoryId);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!firestore || !deletingCategoryId) return;
    const categoryRef = doc(firestore, 'categories', deletingCategoryId);
    deleteDocumentNonBlocking(categoryRef);
    toast({
      title: 'Category Deleted',
      description: 'The category has been successfully deleted.',
    });
    setIsAlertOpen(false);
    setDeletingCategoryId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Management</CardTitle>
          <CardDescription>
            Add, edit, or remove task categories and subcategories.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading categories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Category Management</CardTitle>
            <CardDescription>
              Add, edit, or remove task categories and subcategories.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {parentCategories.map(pCat => {
              const subCats = subCategories.filter(s => s.parentId === pCat.id);
              const color = getCategoryColor(pCat.id);
              return (
                <AccordionItem value={pCat.id} key={pCat.id}>
                  <div className="flex items-center group">
                    <AccordionTrigger className="font-semibold text-base hover:no-underline flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'h-4 w-4 rounded-full',
                            `bg-${color}-500`
                          )}
                        ></span>
                        <span>{pCat.name}</span>
                      </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-2 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenForm(pCat)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => confirmDelete(pCat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <AccordionContent>
                    <ul className="space-y-2 pl-8 pt-2">
                      {subCats.map(sCat => (
                        <li
                          key={sCat.id}
                          className="group flex items-center justify-between p-2 rounded-md hover:bg-accent"
                        >
                          <span>{sCat.name}</span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenForm(sCat)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => confirmDelete(sCat.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
      <CategoryForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        category={editingCategory}
        parentCategories={parentCategories}
      />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
