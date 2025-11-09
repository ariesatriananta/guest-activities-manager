"use client"

import { use } from "react"
import { useBooking } from "@/lib/hooks/useBookings"
import { useActivities } from "@/lib/hooks/useActivities"
import { useVenues } from "@/lib/hooks/useVenues"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Printer, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function BEOPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { data: booking, isLoading } = useBooking(resolvedParams.id)
  const { data: activities } = useActivities()
  const { data: venues } = useVenues()

  const activity = activities?.find((a) => a.id === booking?.activityId)
  const venue = venues?.find((v) => v.id === booking?.venueId)

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-9 w-24 rounded" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Booking not found</p>
          <Button
            onClick={() => {
              try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back()
              } else {
                router.push('/bookings')
              }
              setTimeout(() => { try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {} }, 50)
            }}
          >
            Back to Bookings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden bg-background border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              try { window.dispatchEvent(new CustomEvent('toploader:start')) } catch {}
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back()
              } else {
                router.push('/bookings')
              }
              setTimeout(() => { try { window.dispatchEvent(new CustomEvent('toploader:stop')) } catch {} }, 50)
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print BEO
          </Button>
        </div>
      </div>

      {/* BEO Document */}
      <div className="min-h-screen bg-white text-black p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-6">
            <h1 className="text-3xl font-bold mb-2">BANQUET EVENT ORDER</h1>
            <p className="text-lg">Guest Activities Department</p>
          </div>

          {/* Event Information */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">EVENT NAME</p>
                <p className="text-lg font-bold">{activity?.name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">DATE</p>
                <p className="text-lg">{booking.date}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">TIME</p>
                <p className="text-lg">
                  {booking.startTime} - {booking.endTime}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">VENUE</p>
                <p className="text-lg">{venue?.name}</p>
                {venue?.location && <p className="text-sm text-gray-600">{venue.location}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-600">GUEST NAME</p>
                <p className="text-lg font-bold">{booking.guestName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">SUITE NUMBER</p>
                <p className="text-lg">{booking.suiteNumber}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">NUMBER OF GUESTS</p>
                <p className="text-lg">{booking.pax} PAX</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">BOOKING ID</p>
                <p className="text-sm text-gray-600">{booking.id}</p>
              </div>
            </div>
          </div>

          {/* Staff Assignment */}
          <div className="border-t-2 border-gray-300 pt-6">
            <h2 className="text-xl font-bold mb-4">STAFF ASSIGNMENT</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-semibold text-gray-600">GUEST ACTIVITIES COORDINATOR</p>
                <p className="text-lg">{booking.gaName || "TBD"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">DRIVER</p>
                <p className="text-lg">{booking.driverName || "TBD"}</p>
              </div>
            </div>
          </div>

          {/* Activity Details */}
          {activity?.description && (
            <div className="border-t-2 border-gray-300 pt-6">
              <h2 className="text-xl font-bold mb-4">ACTIVITY DETAILS</h2>
              <p className="text-base leading-relaxed">{activity.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">DURATION</p>
                  <p className="text-base">{activity.duration} minutes</p>
                </div>
                {activity.maxCapacity && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600">MAX CAPACITY</p>
                    <p className="text-base">{activity.maxCapacity} guests</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {booking.remark && (
            <div className="border-t-2 border-gray-300 pt-6">
              <h2 className="text-xl font-bold mb-4">SPECIAL INSTRUCTIONS / REMARKS</h2>
              <div className="bg-gray-50 p-4 rounded border border-gray-300">
                <p className="text-base leading-relaxed whitespace-pre-wrap">{booking.remark}</p>
              </div>
            </div>
          )}

          {/* Setup Requirements */}
          <div className="border-t-2 border-gray-300 pt-6">
            <h2 className="text-xl font-bold mb-4">SETUP REQUIREMENTS</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 border-2 border-black mt-1" />
                <p className="text-base">Venue prepared and cleaned</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 border-2 border-black mt-1" />
                <p className="text-base">Equipment checked and ready</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 border-2 border-black mt-1" />
                <p className="text-base">Transportation arranged (if applicable)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 border-2 border-black mt-1" />
                <p className="text-base">Staff briefed on guest preferences</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t-2 border-gray-300 pt-6">
            <h2 className="text-xl font-bold mb-4">CONTACT INFORMATION</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-semibold text-gray-600">GUEST ACTIVITIES DEPARTMENT</p>
                <p className="text-base">Extension: 1234</p>
                <p className="text-base">Email: activities@hotel.com</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">EMERGENCY CONTACT</p>
                <p className="text-base">Security: Extension 9999</p>
                <p className="text-base">Medical: Extension 8888</p>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="border-t-2 border-black pt-6 mt-8">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <div className="border-b-2 border-black h-12" />
                  <p className="text-sm font-semibold mt-2">GA COORDINATOR SIGNATURE</p>
                  <p className="text-xs text-gray-600">Date: _________________</p>
                </div>
              </div>
              <div className="space-y-8">
                <div>
                  <div className="border-b-2 border-black h-12" />
                  <p className="text-sm font-semibold mt-2">MANAGER APPROVAL</p>
                  <p className="text-xs text-gray-600">Date: _________________</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-300">
            <p>This document is confidential and intended for internal use only.</p>
            <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </>
  )
}
