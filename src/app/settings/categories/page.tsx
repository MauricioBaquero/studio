import { getParentCategories, getSubCategories, getCategoryById } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Edit, PlusCircle, Trash2 } from "lucide-react";

export default function CategoriesPage() {
  const parentCategories = getParentCategories();

  return (
    <Card>
       <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <CardTitle>Category Management</CardTitle>
          <CardDescription>
            Add, edit, or remove task categories and subcategories.
          </CardDescription>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4"/>
          Add Category
        </Button>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {parentCategories.map((pCat) => {
            const subCats = getSubCategories(pCat.id);
            return (
              <AccordionItem value={pCat.id} key={pCat.id}>
                <AccordionTrigger className="font-semibold text-base hover:no-underline group">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>{pCat.name}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pl-8 pt-2">
                    {subCats.map((sCat) => (
                       <li key={sCat.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-accent">
                         <span>{sCat.name}</span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
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
  );
}
