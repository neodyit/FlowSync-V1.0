"use client"

import { Star, MessageCircle, UserPlus, Shield, Building2, Briefcase, History, Edit2, Power, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type ProfileCardProps = {
  name: string
  role: string
  status: "online" | "offline" | "away"
  avatar: string
  tags?: string[]
  isVerified?: boolean
  followers?: number
  college?: string
  department?: string
  email?: string
  id?: number
  onEdit?: () => void
  onToggleStatus?: () => void
  onDelete?: () => void
  onLogs?: () => void
}

export default function AnimatedProfileCard() {
  const alexProfile: ProfileCardProps = {
    name: "Mayank Tiwari",
    role: "UI/UX Designer",
    status: "online",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&h=250&auto=format&fit=crop",
    tags: ["Premium"],
    isVerified: true,
    followers: 1240,
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center w-full justify-center p-4 relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"
          style={{
            backgroundImage: `
              linear-gradient(rgba(156, 163, 175, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(156, 163, 175, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            animation: "gridMove 20s linear infinite",
          }}
        />
      </div>

      <ProfileCard {...alexProfile} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
      `}} />
    </div>
  )
}

export function ProfileCard({ 
  name, role, status, avatar, tags = [], isVerified, followers, 
  college, department, email, id, onEdit, onToggleStatus, onDelete, onLogs 
}: ProfileCardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-[2.5rem] bg-[#EDE9FE]/70 light:bg-[#1E1B4B]/70 backdrop-blur-md p-8 w-full transition-all duration-500 hover:-translate-y-1",
      status === "online" 
        ? "border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]" 
        : "shadow-[12px_12px_24px_rgba(0,0,0,0.05),-12px_-12px_24px_rgba(255,255,255,0.8)] hover:shadow-[20px_20px_40px_rgba(124,58,237,0.1)] hover:scale-[1.02]"
    )}>
      {/* Status indicator with pulse animation */}
      <div className="absolute right-6 top-6 z-10">
        <div className="relative">
          <div
            className={cn(
              "h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 transition-all duration-300 group-hover:scale-125",
              status === "online"
                ? "bg-green-500 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                : status === "away"
                  ? "bg-amber-500"
                  : "bg-gray-400",
            )}
          ></div>
          {status === "online" && (
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-30"></div>
          )}
        </div>
      </div>

      {/* Verified badge / Role Icon */}
      <div className="absolute right-6 top-12 z-10">
        <div className="rounded-full bg-[#7C3AED] p-1.5 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-purple-500/30">
          <Shield className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      {/* Profile Photo with enhanced hover effects */}
      <div className="mb-6 flex justify-center relative z-10">
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-[2rem] bg-slate-50 p-1 shadow-[inset_6px_6px_12px_rgba(0,0,0,0.05),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] transition-all duration-500 group-hover:shadow-[inset_8px_8px_16px_rgba(0,0,0,0.1)] group-hover:scale-105 border border-slate-100">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="h-full w-full rounded-[1.8rem] object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="h-full w-full rounded-[1.8rem] flex items-center justify-center text-3xl font-black text-[#1E1B4B]">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Glowing ring on hover */}
          <div className="absolute inset-0 rounded-[2rem] border-2 border-[#7C3AED]/20 opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
        <h3 className="text-xl font-black text-[#1E1B4B] group-hover:text-[#7C3AED] transition-colors duration-300">
          {name}
        </h3>
        <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
          {email || role}
        </p>

        {followers && (
          <p className="mt-2 text-[10px] text-slate-300 font-black uppercase tracking-widest">
            {followers.toLocaleString()} System Interactions
          </p>
        )}
      </div>

      {/* Tags / Institution Info */}
      <div className="mt-6 space-y-3 relative z-10">
        {college && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 transition-all group-hover:bg-white group-hover:border-[#7C3AED]/10">
            <Building2 className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-xs font-bold text-[#1E1B4B] truncate">{college}</span>
          </div>
        )}
        {department && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 transition-all group-hover:bg-white group-hover:border-[#7C3AED]/10">
            <Briefcase className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-xs font-bold text-[#1E1B4B] truncate">{department}</span>
          </div>
        )}
      </div>

      {/* Role & Status Badge */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <span className="px-4 py-1.5 bg-[#7C3AED] text-white text-[10px] font-black rounded-xl uppercase tracking-[0.2em] shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
          {role}
        </span>
        {id !== 1 && (
          status === "offline" ? (
            <span className="px-3 py-1 bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-black rounded-lg uppercase tracking-wider">
              Inactive
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black rounded-lg uppercase tracking-wider">
              Active
            </span>
          )
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-3 relative z-10">
        {onEdit && (
          <button 
            onClick={onEdit}
            title="Edit User"
            className="flex-1 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7C3AED] hover:border-[#7C3AED] hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:scale-95 active:scale-90"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
        {onToggleStatus && (
          <button 
            onClick={onToggleStatus}
            title="Toggle Active Status"
            className="flex-1 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 hover:scale-95 active:scale-90"
          >
            <Power className="h-4 w-4" />
          </button>
        )}
        {onLogs && (
          <button 
            onClick={onLogs}
            title="View Logs"
            className="flex-1 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#7C3AED] hover:border-[#7C3AED] hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:scale-95 active:scale-90"
          >
            <History className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button 
            onClick={onDelete}
            title="Delete User"
            className="flex-1 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-300 hover:text-rose-500 hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 transition-all duration-300 hover:scale-95 active:scale-90"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Animated border on hover */}
      <div className="absolute inset-0 rounded-[2.5rem] border border-[#7C3AED]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
  )
}
