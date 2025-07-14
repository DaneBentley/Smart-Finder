"use client"

import React, { useEffect, useState } from 'react'

export function AnimatedMagnifyingGlass() {
  const [scrollY, setScrollY] = useState(0)
  const [targetElement, setTargetElement] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Cycle through different target elements every 8 seconds
    const interval = setInterval(() => {
      setTargetElement(prev => (prev + 1) % 4)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Single blue magnifying glass */}
      <div 
        className={`magnifying-glass-single magnifying-glass-target-${targetElement}`}
        style={{
          transform: `translateY(${scrollY * 0.1}px)`,
        }}
      >
        <svg 
          width="140" 
          height="140" 
          viewBox="0 0 140 140" 
          className="magnifying-glass-svg"
        >
          <defs>
            <radialGradient id="glassGradientBlue" cx="0.3" cy="0.3" r="0.7">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
              <stop offset="70%" stopColor="rgba(59, 130, 246, 0.15)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.08)" />
            </radialGradient>
            <filter id="glowBlue">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="blurEffect">
              <feGaussianBlur stdDeviation="2" result="blur"/>
            </filter>
          </defs>
          
          {/* Magnifying glass circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="40" 
            fill="url(#glassGradientBlue)" 
            stroke="rgba(59, 130, 246, 0.6)" 
            strokeWidth="3"
            filter="url(#glowBlue)"
          />
          
          {/* Handle */}
          <line 
            x1="85" 
            y1="85" 
            x2="115" 
            y2="115" 
            stroke="rgba(59, 130, 246, 0.6)" 
            strokeWidth="5" 
            strokeLinecap="round"
            filter="url(#glowBlue)"
          />
          
          {/* Inner lens reflection */}
          <circle 
            cx="42" 
            cy="42" 
            r="10" 
            fill="rgba(255, 255, 255, 0.5)" 
            opacity="0.7"
          />
          
          {/* Lens highlight */}
          <circle 
            cx="38" 
            cy="38" 
            r="4" 
            fill="rgba(255, 255, 255, 0.8)" 
            opacity="0.9"
          />
        </svg>
      </div>
    </div>
  )
} 