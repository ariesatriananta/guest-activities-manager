"use client"

import { NavLayout } from "@/components/layout/nav-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoriesSettings } from "@/components/features/settings/categories-settings"
import { ActivitiesSettings } from "@/components/features/settings/activities-settings"
import { VenuesSettings } from "@/components/features/settings/venues-settings"
import { UsersSettings } from "@/components/features/settings/users-settings"
import { useSession } from "next-auth/react"

function SettingsContent() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage categories, activities, and venues</p>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          {role === "admin" && <TabsTrigger value="users">Users</TabsTrigger>}
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <CategoriesSettings />
        </TabsContent>

        <TabsContent value="activities" className="mt-6">
          <ActivitiesSettings />
        </TabsContent>

        <TabsContent value="venues" className="mt-6">
          <VenuesSettings />
        </TabsContent>

        {role === "admin" && (
          <TabsContent value="users" className="mt-6">
            <UsersSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <NavLayout>
      <SettingsContent />
    </NavLayout>
  )
}
