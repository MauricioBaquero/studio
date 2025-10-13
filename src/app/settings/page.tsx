import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function GeneralSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>
          Adjust general settings for the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="completion-range">
              Minimum Completion Date Range (Days)
            </Label>
            <Input
              id="completion-range"
              type="number"
              defaultValue="7"
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              Set the minimum number of days from today for a ticket's requested completion date.
            </p>
          </div>
        </form>
      </CardContent>
       <CardFooter className="border-t px-6 py-4">
          <Button>Save Changes</Button>
        </CardFooter>
    </Card>
  );
}
