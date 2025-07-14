"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Zap,
  Shield,
  Brain,
  Target,
  Github,
  Chrome,
  HelpCircle,
  Lock,
  ScrollText,
  ExternalLink,
  Keyboard,
} from "lucide-react"
import Image from "next/image"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { AnimatedMagnifyingGlass } from "@/components/animated-magnifying-glass"

function AnimatedSection({
  children,
  className = "",
  animation = "animate-fade-in",
}: {
  children: React.ReactNode
  className?: string
  animation?: string
}) {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <div ref={ref} className={`${className} ${isVisible ? animation : ""}`}>
      {children}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-saira">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <AnimatedSection animation="animate-slide-in-left">
              <div className="flex items-center space-x-4">
                <Image src="/logo.png" alt="Smart Finder" width={36} height={36} />
                <span className="text-xl font-semibold text-gray-900">Smart Finder</span>
              </div>
            </AnimatedSection>
            <AnimatedSection animation="animate-slide-in-right">
              <nav className="hidden md:flex items-center space-x-10">
                <a href="#how-to-use" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                  How to Use
                </a>
                <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                  Features
                </a>
                <a
                  href="https://danebentley.github.io/Smart-Finder/help.html"
                  className="text-gray-600 hover:text-gray-900 transition-colors font-medium flex items-center"
                >
                  Help <ExternalLink className="w-3 h-3 ml-1" />
                </a>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full border-2 hover:bg-gray-50 bg-transparent"
                >
                  <a
                    href="https://chromewebstore.google.com/detail/smart-finder/dhnhlkpgbbglkgaljoimcgbgnblbjeop"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Chrome className="w-4 h-4 mr-2" />
                    Install Extension
                  </a>
                </Button>
              </nav>
            </AnimatedSection>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 lg:py-40 hero-animated-bg relative overflow-hidden">
        <AnimatedMagnifyingGlass />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            <AnimatedSection animation="animate-fade-in">
              <Badge
                variant="secondary"
                className="mb-8 bg-blue-50 text-blue-700 border-blue-200 rounded-full px-4 py-2"
              >
                Free Chrome Extension
              </Badge>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up animation-delay-200">
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
                Find what matters—fast
              </h1>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up animation-delay-400">
              <p className="text-2xl text-gray-600 mb-12 leading-relaxed max-w-4xl mx-auto">
                Replace Ctrl+F with smarter search. Type <span className="bg-[#f8d3d9] px-2 py-1">email</span> to find
                all emails, or ask <span className="bg-[#deb5e3] px-2 py-1">what's the main point?</span> for AI
                answers.
              </p>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-up animation-delay-600">
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
                <Button
                  asChild
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  <a
                    href="https://chromewebstore.google.com/detail/smart-finder/dhnhlkpgbbglkgaljoimcgbgnblbjeop"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Chrome className="w-5 h-5 mr-3" />
                    Install Extension
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="px-10 py-4 text-lg rounded-full border-2 hover:bg-gray-50 bg-transparent"
                >
                  <a href="https://github.com/DaneBentley/Smart-Finder" target="_blank" rel="noopener noreferrer">
                    <Github className="w-5 h-5 mr-3" />
                    View Source
                  </a>
                </Button>
              </div>
            </AnimatedSection>

            {/* Quick Stats */}
            <AnimatedSection animation="animate-fade-in animation-delay-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-3xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">Free</div>
                  <div className="text-gray-600 font-medium">Core Features</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">12+</div>
                  <div className="text-gray-600 font-medium">Auto Patterns</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">Ctrl+F</div>
                  <div className="text-gray-600 font-medium">Same Shortcut</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">50</div>
                  <div className="text-gray-600 font-medium">Free AI Searches</div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section id="how-to-use" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <AnimatedSection className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">How to use Smart Finder</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Three ways to search, all using the same familiar Ctrl+F shortcut you already know.
            </p>
          </AnimatedSection>

          <div className="space-y-16">
            {/* Traditional Search */}
            <AnimatedSection animation="animate-slide-up">
              <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
                <CardContent className="p-12">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                      <div className="flex items-center mb-6">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mr-6">
                          <Search className="w-7 h-7 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-semibold text-gray-900 mb-2">Traditional Search</h3>
                          <Badge className="bg-green-100 text-green-800 rounded-full px-3 py-1">Always Free</Badge>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                        Works exactly like Chrome's built-in search, but with better highlighting and performance.
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center text-gray-700">
                          <Keyboard className="w-5 h-5 mr-4 text-gray-400" />
                          <span className="font-medium">Press Ctrl+F (or Cmd+F on Mac)</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <span className="w-5 h-5 mr-4"></span>
                          <span>Type your search term</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <span className="w-5 h-5 mr-4"></span>
                          <span>Use Enter/Shift+Enter to navigate results</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-100 p-8 rounded-2xl">
                      <div className="text-gray-600 mb-4 font-medium">Try searching for:</div>
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                          <span className="bg-[#fceca3] px-2 py-1">contact</span> - Find exact word matches
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                          <span className="bg-[#c4f2bd] px-2 py-1">"customer service"</span> - Find exact phrases
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>

            {/* Pattern Search */}
            <AnimatedSection animation="animate-slide-up animation-delay-200">
              <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
                <CardContent className="p-12">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                      <div className="flex items-center mb-6">
                        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mr-6">
                          <Target className="w-7 h-7 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-semibold text-gray-900 mb-2">Pattern Search</h3>
                          <Badge className="bg-green-100 text-green-800 rounded-full px-3 py-1">Always Free</Badge>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                        Just type simple keywords and Smart Finder automatically finds all matching patterns.
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center text-gray-700">
                          <Keyboard className="w-5 h-5 mr-4 text-gray-400" />
                          <span className="font-medium">Press Ctrl+F (or Cmd+F on Mac)</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <span className="w-5 h-5 mr-4"></span>
                          <span>Type a pattern name (like "email" or "phone")</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <span className="w-5 h-5 mr-4"></span>
                          <span>All matches highlight instantly</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-100 p-8 rounded-2xl">
                      <div className="text-gray-600 mb-4 font-medium">Type these keywords:</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-xl border shadow-sm">
                          <span className="bg-[#f8d3d9] px-2 py-1">email</span> - All emails
                        </div>
                        <div className="bg-white p-3 rounded-xl border shadow-sm">
                          <span className="bg-[#deb5e3] px-2 py-1">phone</span> - All phones
                        </div>
                        <div className="bg-white p-3 rounded-xl border shadow-sm">
                          <span className="bg-[#c4f2bd] px-2 py-1">date</span> - All dates
                        </div>
                        <div className="bg-white p-3 rounded-xl border shadow-sm">
                          <span className="bg-[#bcdff0] px-2 py-1">url</span> - All links
                        </div>
                        <div className="bg-white p-3 rounded-xl border shadow-sm">
                          <span className="bg-[#fceca3] px-2 py-1">address</span> - Addresses
                        </div>
                        <div className="bg-white p-3 rounded-xl border shadow-sm">
                          <span className="bg-[#f8d3d9] px-2 py-1">ip</span> - IP addresses
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>

            {/* AI Search */}
            <AnimatedSection animation="animate-slide-up animation-delay-400">
              <Card className="border-0 shadow-lg rounded-3xl overflow-hidden">
                <CardContent className="p-12">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                      <div className="flex items-center mb-6">
                        <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mr-6">
                          <Brain className="w-7 h-7 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-semibold text-gray-900 mb-2">AI Search</h3>
                          <Badge className="bg-blue-100 text-blue-800 rounded-full px-3 py-1">50 Free/Month</Badge>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                        Ask questions in plain English. The AI understands what you're looking for and finds relevant
                        content.
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center text-gray-700">
                          <Keyboard className="w-5 h-5 mr-4 text-gray-400" />
                          <span className="font-medium">Sign in with Google (one-time setup)</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <span className="w-5 h-5 mr-4"></span>
                          <span>Press Ctrl+F and ask a question</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <span className="w-5 h-5 mr-4"></span>
                          <span>AI finds and highlights relevant content</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-100 p-8 rounded-2xl">
                      <div className="text-gray-600 mb-4 font-medium">Ask questions like:</div>
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                          <span className="bg-[#f8d3d9] px-2 py-1">What's the main point?</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                          <span className="bg-[#deb5e3] px-2 py-1">Find contact information</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                          <span className="bg-[#c4f2bd] px-2 py-1">Show me pricing details</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                          <span className="bg-[#bcdff0] px-2 py-1">What are the key statistics?</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <AnimatedSection className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Features that save time</h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            <AnimatedSection animation="animate-scale-in">
              <Card className="border-0 shadow-lg rounded-2xl hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mb-6">
                    <Zap className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">Works on Dynamic Content</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    Finds content that loads after the page, like infinite scroll feeds and dynamic updates.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="animate-scale-in animation-delay-200">
              <Card className="border-0 shadow-lg rounded-2xl hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                    <Target className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">Multi-Color Highlighting</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    Search multiple terms at once with different colors. Perfect for comparing or tracking data points.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="animate-scale-in animation-delay-400">
              <Card className="border-0 shadow-lg rounded-2xl hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                    <Shield className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">Privacy Focused</h3>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    Traditional and pattern searches happen locally. AI searches are processed securely.
                  </p>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <AnimatedSection className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Tips</h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-12">
            <AnimatedSection animation="animate-slide-in-left">
              <Card className="border-0 shadow-lg rounded-2xl">
                <CardContent className="p-10">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6">Save Your AI Searches</h3>
                  <ul className="space-y-4 text-gray-600 text-lg">
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-4 mt-3"></div>
                      <span>Try traditional search first for exact words</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-4 mt-3"></div>
                      <span>Use pattern search ("email", "phone") instead of AI when possible</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-4 mt-3"></div>
                      <span>Be specific with AI questions for better results</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-4 mt-3"></div>
                      <span>Failed AI searches don't cost tokens</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-in-right">
              <Card className="border-0 shadow-lg rounded-2xl">
                <CardContent className="p-10">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-6">Common Use Cases</h3>
                  <ul className="space-y-4 text-gray-600 text-lg">
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-4 mt-3"></div>
                      <span>Research papers: "find the methodology" or "key findings"</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-4 mt-3"></div>
                      <span>Contact pages: type "email" or "phone" for instant results</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-4 mt-3"></div>
                      <span>Shopping: "pricing" or "return policy"</span>
                    </li>
                    <li className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-4 mt-3"></div>
                      <span>Legal docs: "important dates" or "key terms"</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <AnimatedSection className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Free to use</h2>
            <p className="text-xl text-gray-600">
              Core features are always free. AI searches come with 50 free searches per month.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-12">
            <AnimatedSection animation="animate-slide-in-left">
              <Card className="border-2 border-green-200 bg-green-50 rounded-3xl shadow-lg">
                <CardContent className="p-10">
                  <h3 className="text-3xl font-bold text-gray-900 mb-8">Always Free</h3>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center text-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                      Traditional search (unlimited)
                    </li>
                    <li className="flex items-center text-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                      Pattern detection (unlimited)
                    </li>
                    <li className="flex items-center text-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                      Multi-color highlighting
                    </li>
                    <li className="flex items-center text-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-4"></div>
                      Works on all websites
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </AnimatedSection>

            <AnimatedSection animation="animate-slide-in-right">
              <Card className="border-2 border-blue-200 rounded-3xl shadow-lg">
                <CardContent className="p-10">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">AI Search</h3>
                  <div className="text-xl text-gray-600 mb-8">50 free searches/month</div>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center text-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                      Natural language questions
                    </li>
                    <li className="flex items-center text-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                      Powered by Groq Llama 3.1
                    </li>
                    <li className="flex items-center text-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                      Monthly free allowance resets
                    </li>
                    <li className="flex items-center text-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                      Additional: $0.01 per search
                    </li>
                  </ul>
                  <p className="text-gray-600">Requires Google sign-in for usage tracking</p>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <AnimatedSection animation="animate-slide-up">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8">Start finding what matters—fast</h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Install Smart Finder and use the same Ctrl+F shortcut you already know, but with smarter results.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <a
                  href="https://chromewebstore.google.com/detail/smart-finder/dhnhlkpgbbglkgaljoimcgbgnblbjeop"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Chrome className="w-5 h-5 mr-3" />
                  Install Extension
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-12 py-4 text-lg rounded-full border-2 hover:bg-gray-50 bg-transparent"
              >
                <a
                  href="https://danebentley.github.io/Smart-Finder/help.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <HelpCircle className="w-5 h-5 mr-3" />
                  Read Full Guide
                </a>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <AnimatedSection animation="animate-fade-in">
            <div className="grid md:grid-cols-3 gap-12">
              <div>
                <div className="flex items-center space-x-4 mb-6">
                  <Image src="/logo.png" alt="Smart Finder" width={28} height={28} />
                  <span className="text-xl font-semibold text-gray-900">Smart Finder</span>
                </div>
                <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                  Free Chrome extension that makes finding information on web pages faster and smarter.
                </p>
                <p className="text-gray-500">
                  Works in English and translated sites in Spanish, French, German, Italian, Portuguese, Dutch, and
                  more.
                </p>
              </div>

              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-6">Help & Support</h4>
                <ul className="space-y-4">
                  <li>
                    <a
                      href="https://danebentley.github.io/Smart-Finder/help.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 transition-colors flex items-center text-lg"
                    >
                      <HelpCircle className="w-5 h-5 mr-3" />
                      Complete User Guide
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://danebentley.github.io/Smart-Finder/privacy-policy.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 transition-colors flex items-center text-lg"
                    >
                      <Lock className="w-5 h-5 mr-3" />
                      Privacy Policy
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://danebentley.github.io/Smart-Finder/terms-conditions.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 transition-colors flex items-center text-lg"
                    >
                      <ScrollText className="w-5 h-5 mr-3" />
                      Terms & Conditions
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xl font-semibold text-gray-900 mb-6">Links</h4>
                <ul className="space-y-4">
                  <li>
                    <a
                      href="https://github.com/DaneBentley/Smart-Finder"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 transition-colors flex items-center text-lg"
                    >
                      <Github className="w-5 h-5 mr-3" />
                      GitHub Repository
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://chromewebstore.google.com/detail/smart-finder/dhnhlkpgbbglkgaljoimcgbgnblbjeop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 transition-colors flex items-center text-lg"
                    >
                      <Chrome className="w-5 h-5 mr-3" />
                      Chrome Web Store
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-16 pt-12 text-center">
              <p className="text-gray-500 text-lg">© 2024 Smart Finder. Free and open source. Chrome required.</p>
            </div>
          </AnimatedSection>
        </div>
      </footer>
    </div>
  )
}
