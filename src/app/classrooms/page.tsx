'use client';

import React, { useState, useMemo } from 'react';
import { useCampusTime } from '@/lib/context/campus-time-context';
import { CLASSROOM_DATA } from '@/data';
import { ClassroomCard } from '@/components/student/ClassroomCard';
import { getClassroomAvailability } from '@/lib/availability/classroom-availability';
import { DoorOpen, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ClassroomsPage() {
  const { day, timeStr } = useCampusTime();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Vacant' | 'Occupied'>('All');
  const [minCapacity, setMinCapacity] = useState<number>(0);

  // Extract unique buildings
  const buildings = useMemo(() => {
    const set = new Set(CLASSROOM_DATA.map(r => r.buildingName));
    return ['All', ...Array.from(set)];
  }, []);

  // Filtered rooms
  const filteredClassrooms = useMemo(() => {
    return CLASSROOM_DATA.filter(room => {
      // Search query filter (room number or amenities)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRoom = room.roomNumber.toLowerCase().includes(q);
        const matchesBld = room.buildingName.toLowerCase().includes(q);
        const matchesAmenity = room.amenities.some(a => a.toLowerCase().includes(q));
        if (!matchesRoom && !matchesBld && !matchesAmenity) return false;
      }

      // Building filter
      if (selectedBuilding !== 'All' && room.buildingName !== selectedBuilding) {
        return false;
      }

      // Type filter
      if (selectedType !== 'All' && room.type !== selectedType) {
        return false;
      }

      // Capacity filter
      if (minCapacity > 0 && room.capacity < minCapacity) {
        return false;
      }

      // Availability status filter
      if (selectedStatus !== 'All') {
        const avail = getClassroomAvailability(room, day, timeStr);
        if (selectedStatus === 'Vacant' && avail.isOccupied) return false;
        if (selectedStatus === 'Occupied' && !avail.isOccupied) return false;
      }

      return true;
    });
  }, [searchQuery, selectedBuilding, selectedType, selectedStatus, minCapacity, day, timeStr]);

  // Compute stats
  const totalRooms = CLASSROOM_DATA.length;
  const vacantRoomsCount = CLASSROOM_DATA.filter(r => !getClassroomAvailability(r, day, timeStr).isOccupied).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <DoorOpen className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Classroom Availability & Space Matrix
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time vacancy tracking to eliminate classroom under-utilization. Find free study rooms, lecture halls, and lab terminals.
          </p>
        </div>

        {/* Live Vacancy Stat Pill */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            {vacantRoomsCount}
          </div>
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase">
              Vacant Spaces Right Now
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {vacantRoomsCount} of {totalRooms} rooms free at {day} {timeStr}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Room / Amenity Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search room (LH-101), amenity (GPU)..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Building Selector */}
          <div>
            <select
              value={selectedBuilding}
              onChange={e => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {buildings.map(b => (
                <option key={b} value={b}>
                  {b === 'All' ? 'All Buildings' : b}
                </option>
              ))}
            </select>
          </div>

          {/* Room Type */}
          <div>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Room Types</option>
              <option value="Lecture Hall">Lecture Hall</option>
              <option value="Computer Lab">Computer Lab</option>
              <option value="Seminar Room">Seminar Room</option>
              <option value="Tutorial Room">Tutorial Room</option>
            </select>
          </div>

          {/* Vacancy Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as 'All' | 'Vacant' | 'Occupied')}
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Occupancy States</option>
              <option value="Vacant">Only Vacant Now</option>
              <option value="Occupied">Only Occupied Now</option>
            </select>
          </div>

          {/* Capacity */}
          <div>
            <select
              value={minCapacity}
              onChange={e => setMinCapacity(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={0}>Any Seating Capacity</option>
              <option value={40}>40+ Seats</option>
              <option value={60}>60+ Seats</option>
              <option value={90}>90+ Seats</option>
              <option value={120}>120+ Seats</option>
            </select>
          </div>
        </div>

        {/* Filter Reset & Counter */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <span>
            Showing <strong>{filteredClassrooms.length}</strong> of {totalRooms} instructional rooms
          </span>
          {(searchQuery || selectedBuilding !== 'All' || selectedType !== 'All' || selectedStatus !== 'All' || minCapacity > 0) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedBuilding('All');
                setSelectedType('All');
                setSelectedStatus('All');
                setMinCapacity(0);
              }}
              className="text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Classroom Grid */}
      {filteredClassrooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClassrooms.map(classroom => (
            <ClassroomCard
              key={classroom.id}
              classroom={classroom}
              day={day}
              timeStr={timeStr}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <DoorOpen className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
            No classrooms found matching criteria
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, lowering the minimum capacity threshold, or toggling between vacant and occupied filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSearchQuery('');
              setSelectedBuilding('All');
              setSelectedType('All');
              setSelectedStatus('All');
              setMinCapacity(0);
            }}
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}
