import type { ActivityCategory, Activity, Venue, Booking, ListBookingsParams } from "@/lib/types"

const STORAGE_KEY = "guest-activities-db"

interface Database {
  categories: ActivityCategory[]
  activities: Activity[]
  venues: Venue[]
  bookings: Booking[]
}

// In-memory database
let db: Database = {
  categories: [],
  activities: [],
  venues: [],
  bookings: [],
}

// Load from localStorage
function loadFromStorage(): void {
  if (typeof window === "undefined") return

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      db = JSON.parse(stored)
    }
  } catch (error) {
    console.error("[v0] Failed to load from localStorage:", error)
  }
}

// Save to localStorage
function saveToStorage(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch (error) {
    console.error("[v0] Failed to save to localStorage:", error)
  }
}

// Initialize on load
if (typeof window !== "undefined") {
  loadFromStorage()
}

// Simulate async delay
const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms))

// Categories
export async function listCategories(): Promise<ActivityCategory[]> {
  await delay()
  return [...db.categories]
}

export async function createCategory(data: Omit<ActivityCategory, "id">): Promise<ActivityCategory> {
  await delay()
  const category: ActivityCategory = {
    ...data,
    id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }
  db.categories.push(category)
  saveToStorage()
  return category
}

export async function updateCategory(id: string, data: Partial<ActivityCategory>): Promise<ActivityCategory | null> {
  await delay()
  const index = db.categories.findIndex((c) => c.id === id)
  if (index === -1) return null

  db.categories[index] = { ...db.categories[index], ...data }
  saveToStorage()
  return db.categories[index]
}

export async function deleteCategory(id: string): Promise<boolean> {
  await delay()
  const index = db.categories.findIndex((c) => c.id === id)
  if (index === -1) return false

  // Check if any activities are using this category
  const hasActivities = db.activities.some((a) => a.categoryId === id)
  if (hasActivities) {
    throw new Error("Cannot delete category with existing activities")
  }

  db.categories.splice(index, 1)
  saveToStorage()
  return true
}

// Activities
export async function listActivities(): Promise<Activity[]> {
  await delay()
  return [...db.activities]
}

export async function getActivitiesByCategory(categoryId: string): Promise<Activity[]> {
  await delay()
  return db.activities.filter((a) => a.categoryId === categoryId && a.isActive)
}

export async function createActivity(data: Omit<Activity, "id">): Promise<Activity> {
  await delay()
  const activity: Activity = {
    ...data,
    id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }
  db.activities.push(activity)
  saveToStorage()
  return activity
}

export async function updateActivity(id: string, data: Partial<Activity>): Promise<Activity | null> {
  await delay()
  const index = db.activities.findIndex((a) => a.id === id)
  if (index === -1) return null

  db.activities[index] = { ...db.activities[index], ...data }
  saveToStorage()
  return db.activities[index]
}

export async function deleteActivity(id: string): Promise<boolean> {
  await delay()
  const index = db.activities.findIndex((a) => a.id === id)
  if (index === -1) return false

  db.activities.splice(index, 1)
  saveToStorage()
  return true
}

// Venues
export async function listVenues(): Promise<Venue[]> {
  await delay()
  return [...db.venues]
}

export async function getVenue(id: string): Promise<Venue | null> {
  await delay()
  return db.venues.find((v) => v.id === id) || null
}

export async function createVenue(data: Omit<Venue, "id">): Promise<Venue> {
  await delay()
  const venue: Venue = {
    ...data,
    id: `venue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }
  db.venues.push(venue)
  saveToStorage()
  return venue
}

export async function updateVenue(id: string, data: Partial<Venue>): Promise<Venue | null> {
  await delay()
  const index = db.venues.findIndex((v) => v.id === id)
  if (index === -1) return null

  db.venues[index] = { ...db.venues[index], ...data }
  saveToStorage()
  return db.venues[index]
}

export async function deleteVenue(id: string): Promise<boolean> {
  await delay()
  const index = db.venues.findIndex((v) => v.id === id)
  if (index === -1) return false

  db.venues.splice(index, 1)
  saveToStorage()
  return true
}

// Bookings
export async function listBookings(params?: ListBookingsParams): Promise<Booking[]> {
  await delay()
  let results = [...db.bookings]

  if (params?.dateFrom) {
    results = results.filter((b) => b.date >= params.dateFrom!)
  }
  if (params?.dateTo) {
    results = results.filter((b) => b.date <= params.dateTo!)
  }
  if (params?.venueId) {
    results = results.filter((b) => b.venueId === params.venueId)
  }
  if (params?.categoryId) {
    const categoryActivityIds = db.activities.filter((a) => a.categoryId === params.categoryId).map((a) => a.id)
    results = results.filter((b) => categoryActivityIds.includes(b.activityId))
  }
  if (params?.status) {
    results = results.filter((b) => b.status === params.status)
  }

  return results.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.startTime.localeCompare(b.startTime)
  })
}

export async function getBooking(id: string): Promise<Booking | null> {
  await delay()
  return db.bookings.find((b) => b.id === id) || null
}

export async function createBooking(data: Omit<Booking, "id" | "createdAt">): Promise<Booking> {
  await delay()
  const booking: Booking = {
    ...data,
    id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  db.bookings.push(booking)
  saveToStorage()
  return booking
}

export async function updateBooking(id: string, data: Partial<Booking>): Promise<Booking | null> {
  await delay()
  const index = db.bookings.findIndex((b) => b.id === id)
  if (index === -1) return null

  db.bookings[index] = { ...db.bookings[index], ...data }
  saveToStorage()
  return db.bookings[index]
}

export async function deleteBooking(id: string): Promise<boolean> {
  await delay()
  const index = db.bookings.findIndex((b) => b.id === id)
  if (index === -1) return false

  db.bookings.splice(index, 1)
  saveToStorage()
  return true
}

// Conflict checking
export async function hasVenueConflict(date: string, venueId: string, excludeBookingId?: string): Promise<boolean> {
  await delay()
  const venue = await getVenue(venueId)
  if (!venue?.isSingleBookingPerDay) return false

  const existingBookings = db.bookings.filter(
    (b) => b.date === date && b.venueId === venueId && b.status !== "cancelled" && b.id !== excludeBookingId,
  )

  return existingBookings.length > 0
}

// Seed data
export async function seed(): Promise<void> {
  // Categories
  const categories: ActivityCategory[] = [
    { id: "cat-activities", name: "Activities" },
    { id: "cat-dining", name: "Special Dining" },
    { id: "cat-spiritual", name: "Spiritual" },
  ]

  // Activities
  const activities: Activity[] = [
    // Activities category
    { id: "act-cycling", categoryId: "cat-activities", name: "Cycling Tour", isActive: true },
    { id: "act-trekking", categoryId: "cat-activities", name: "Rice Field Trekking", isActive: true },
    { id: "act-cooking", categoryId: "cat-activities", name: "Cooking Class", isActive: true },
    { id: "act-rafting", categoryId: "cat-activities", name: "River Rafting", isActive: true },
    { id: "act-temple", categoryId: "cat-activities", name: "Temple Visit", isActive: true },

    // Special Dining category
    { id: "din-ramayana", categoryId: "cat-dining", name: "Ramayana Royal Feast Dinner", isActive: true },
    { id: "din-breakfast", categoryId: "cat-dining", name: "Private Breakfast", isActive: true },
    { id: "din-bbq", categoryId: "cat-dining", name: "BBQ Dinner", isActive: true },
    { id: "din-romantic", categoryId: "cat-dining", name: "Romantic Dinner", isActive: true },

    // Spiritual category
    { id: "spi-yoga", categoryId: "cat-spiritual", name: "Morning Yoga", isActive: true },
    { id: "spi-meditation", categoryId: "cat-spiritual", name: "Meditation Session", isActive: true },
    { id: "spi-blessing", categoryId: "cat-spiritual", name: "Balinese Blessing", isActive: true },
  ]

  // Venues
  const venues: Venue[] = [
    { id: "ven-pool", name: "Pool Terrace", isSingleBookingPerDay: false },
    { id: "ven-dalem", name: "Dalem Jiwo", isSingleBookingPerDay: true },
    { id: "ven-gubug", name: "Gubug Sawah", isSingleBookingPerDay: true },
    { id: "ven-joglo", name: "Joglo Sawah", isSingleBookingPerDay: true },
    { id: "ven-bilal", name: "Pak Bilal House", isSingleBookingPerDay: false },
    { id: "ven-restaurant", name: "Restaurant", isSingleBookingPerDay: false },
    { id: "ven-suite", name: "Own Suite", isSingleBookingPerDay: false },
    { id: "ven-progo1", name: "Progo 1", isSingleBookingPerDay: true },
    { id: "ven-progo2", name: "Progo 2", isSingleBookingPerDay: true },
  ]

  // Sample bookings
  const today = new Date()
  const bookings: Booking[] = [
    {
      id: "book-1",
      date: today.toISOString().split("T")[0],
      startTime: "07:00",
      endTime: "08:30",
      activityId: "spi-yoga",
      venueId: "ven-pool",
      guestName: "John Smith",
      suiteNumber: "Suite 101",
      pax: 2,
      gaName: "Sarah",
      driverName: "Made",
      remark: "Prefer quiet area",
      status: "confirmed",
      createdAt: new Date(today.getTime() - 86400000).toISOString(),
    },
    {
      id: "book-2",
      date: today.toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "12:00",
      activityId: "act-cycling",
      venueId: "ven-bilal",
      guestName: "Emma Wilson",
      suiteNumber: "Suite 203",
      pax: 4,
      gaName: "Wayan",
      driverName: "Ketut",
      remark: "Family with kids",
      status: "confirmed",
      createdAt: new Date(today.getTime() - 86400000).toISOString(),
    },
    {
      id: "book-3",
      date: today.toISOString().split("T")[0],
      startTime: "19:00",
      endTime: "21:00",
      activityId: "din-ramayana",
      venueId: "ven-pool",
      guestName: "Michael Chen",
      suiteNumber: "Suite 305",
      pax: 2,
      gaName: "Komang",
      driverName: "Nyoman",
      remark: "Anniversary celebration",
      status: "confirmed",
      createdAt: new Date(today.getTime() - 172800000).toISOString(),
    },
    // Tomorrow
    {
      id: "book-4",
      date: new Date(today.getTime() + 86400000).toISOString().split("T")[0],
      startTime: "08:00",
      endTime: "10:00",
      activityId: "din-breakfast",
      venueId: "ven-gubug",
      guestName: "Sophie Martin",
      suiteNumber: "Suite 102",
      pax: 2,
      gaName: "Sarah",
      driverName: "Made",
      remark: "Vegetarian options",
      status: "confirmed",
      createdAt: new Date(today.getTime() - 86400000).toISOString(),
    },
    {
      id: "book-5",
      date: new Date(today.getTime() + 86400000).toISOString().split("T")[0],
      startTime: "14:00",
      endTime: "17:00",
      activityId: "act-rafting",
      venueId: "ven-progo1",
      guestName: "David Brown",
      suiteNumber: "Suite 201",
      pax: 6,
      gaName: "Wayan",
      driverName: "Ketut",
      remark: "Group activity",
      status: "confirmed",
      createdAt: new Date(today.getTime() - 86400000).toISOString(),
    },
    // Day after tomorrow
    {
      id: "book-6",
      date: new Date(today.getTime() + 172800000).toISOString().split("T")[0],
      startTime: "10:00",
      endTime: "13:00",
      activityId: "act-cooking",
      venueId: "ven-restaurant",
      guestName: "Lisa Anderson",
      suiteNumber: "Suite 104",
      pax: 3,
      gaName: "Komang",
      driverName: "Nyoman",
      remark: "Interested in traditional recipes",
      status: "confirmed",
      createdAt: new Date(today.getTime() - 86400000).toISOString(),
    },
    {
      id: "book-7",
      date: new Date(today.getTime() + 172800000).toISOString().split("T")[0],
      startTime: "16:00",
      endTime: "18:00",
      activityId: "spi-blessing",
      venueId: "ven-dalem",
      guestName: "Robert Taylor",
      suiteNumber: "Suite 301",
      pax: 2,
      gaName: "Sarah",
      driverName: "Made",
      remark: "First time in Bali",
      status: "confirmed",
      createdAt: new Date(today.getTime() - 86400000).toISOString(),
    },
    // Next week
    {
      id: "book-8",
      date: new Date(today.getTime() + 604800000).toISOString().split("T")[0],
      startTime: "07:00",
      endTime: "09:00",
      activityId: "act-trekking",
      venueId: "ven-joglo",
      guestName: "Anna Schmidt",
      suiteNumber: "Suite 205",
      pax: 2,
      gaName: "Wayan",
      driverName: "Ketut",
      remark: "Early morning preferred",
      status: "confirmed",
      createdAt: new Date(today.getTime() - 86400000).toISOString(),
    },
    {
      id: "book-9",
      date: new Date(today.getTime() + 604800000).toISOString().split("T")[0],
      startTime: "18:30",
      endTime: "21:00",
      activityId: "din-bbq",
      venueId: "ven-pool",
      guestName: "James Wilson",
      suiteNumber: "Suite 303",
      pax: 8,
      gaName: "Komang",
      driverName: "Nyoman",
      remark: "Large group celebration",
      status: "confirmed",
      createdAt: new Date(today.getTime() - 86400000).toISOString(),
    },
    // Draft bookings
    {
      id: "book-10",
      date: new Date(today.getTime() + 259200000).toISOString().split("T")[0],
      startTime: "19:00",
      endTime: "21:30",
      activityId: "din-romantic",
      venueId: "ven-suite",
      guestName: "Oliver Johnson",
      suiteNumber: "Suite 401",
      pax: 2,
      gaName: "Sarah",
      driverName: "Made",
      remark: "Proposal dinner",
      status: "draft",
      createdAt: new Date().toISOString(),
    },
    // Cancelled booking
    {
      id: "book-11",
      date: new Date(today.getTime() + 86400000).toISOString().split("T")[0],
      startTime: "10:00",
      endTime: "12:00",
      activityId: "spi-meditation",
      venueId: "ven-pool",
      guestName: "Maria Garcia",
      suiteNumber: "Suite 105",
      pax: 1,
      gaName: "Wayan",
      driverName: "Ketut",
      remark: "Cancelled due to schedule change",
      status: "cancelled",
      createdAt: new Date(today.getTime() - 172800000).toISOString(),
    },
  ]

  db.categories = categories
  db.activities = activities
  db.venues = venues
  db.bookings = bookings

  saveToStorage()
}

// Reset database (useful for testing)
export async function resetDatabase(): Promise<void> {
  db = {
    categories: [],
    activities: [],
    venues: [],
    bookings: [],
  }
  saveToStorage()
  await seed()
}
