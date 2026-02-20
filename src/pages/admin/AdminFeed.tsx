import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Newspaper, Megaphone } from "lucide-react";
import { FeedPostsContent } from "@/components/admin/FeedPostsContent";
import { AnnouncementsContent } from "@/components/admin/AnnouncementsContent";

export default function AdminFeed() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-fredoka text-3xl lg:text-4xl font-bold text-foreground">
          Feed & Avisos
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie publicações e comunicados para os pais
        </p>
      </div>

      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="feed" className="flex items-center gap-2">
            <Newspaper className="w-4 h-4" />
            Feed
          </TabsTrigger>
          <TabsTrigger value="avisos" className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            Avisos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6">
          <FeedPostsContent />
        </TabsContent>

        <TabsContent value="avisos" className="mt-6">
          <AnnouncementsContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
