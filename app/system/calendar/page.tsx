import { Metadata } from 'next'
import { Suspense } from 'react'
import CalendarClient from '@/components/calendar/CalendarClient'

export const metadata: Metadata = {
  title: 'ปฏิทิน & บันทึกรายวัน | Note & Calendar',
  description: 'ปฏิทินบันทึกกิจกรรม สิ่งที่ทำไปแล้ว และโน้ตสรุปประจำวัน',
}

function CalendarLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm font-semibold text-muted-foreground animate-pulse">
        กำลังโหลดปฏิทินและบันทึกรายวัน...
      </p>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <div className="container mx-auto max-w-6xl py-4 sm:py-6">
      <Suspense fallback={<CalendarLoading />}>
        <CalendarClient />
      </Suspense>
    </div>
  )
}
