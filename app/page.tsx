"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Scissors, Clock, MapPin, Phone, Mail, Star, Calendar, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import BookingForm from '../components/BookingForm'
import { supabase } from '../lib/supabaseClient'
import React, { useEffect, useState } from 'react';

export default function RozersBarberStation() {
  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(50px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes bounceSubtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  .animate-fade-in {
    animation: fadeIn 1s ease-out;
  }
  
  .animate-slide-up {
    animation: slideUp 0.8s ease-out 0.2s both;
  }
  
  .animate-slide-up-delay {
    animation: slideUp 0.8s ease-out 0.4s both;
  }
  
  .animate-slide-up-delay-2 {
    animation: slideUp 0.8s ease-out 0.6s both;
  }
  
  .animate-bounce-subtle {
    animation: bounceSubtle 3s ease-in-out infinite;
  }
`}</style>
      {/* Header */}
      <header className="bg-black text-white sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src="/images/rozers-logo.jpg"
              alt="Rozer's Barber Station Logo"
              width={64}
              height={64}
              className="rounded-full aspect-square object-cover w-16 h-16 md:w-36 md:h-36"
            />
            <h1 className="text-2xl font-bold">Rozer's Barber Station</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="#home" className="hover:text-red-500 transition-colors">
              Home
            </Link>
            <Link href="#services" className="hover:text-red-500 transition-colors">
              Services
            </Link>
            <Link href="#about" className="hover:text-red-500 transition-colors">
              About
            </Link>
            <Link href="#reviews" className="hover:text-red-500 transition-colors">
              Reviews
            </Link>
            <Link href="#contact" className="hover:text-red-500 transition-colors">
              Contact
            </Link>
          </nav>
          <Button className="bg-red-600 hover:bg-red-700 ml-8">
            <Calendar className="h-4 w-4 mr-2" />
            Book Now
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="home"
        className="relative h-screen bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('/images/hero-barbershop.jpg')",
        }}
      >
        <div className="container mx-auto px-4 md:px-8 h-full flex items-center justify-center text-center text-white">
          <div className="max-w-4xl animate-fade-in">
            <div className="mb-8 animate-bounce-subtle">
              <Image
                src="/images/rozers-logo.jpg"
                alt="Rozer's Barber Station Logo"
                width={128}
                height={128}
                className="mx-auto rounded-full aspect-square object-cover bg-white p-2 shadow-2xl w-32 h-32 md:w-72 md:h-72"
              />
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 animate-slide-up">Premium Barbering Experience</h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto animate-slide-up-delay">
              Step into Rozer's Barber Station where traditional craftsmanship meets modern style. Experience the finest
              cuts, shaves, and grooming services in Brampton.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up-delay-2 mb-8">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 transform hover:scale-105 transition-all duration-300"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Book Appointment
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white bg-transparent hover:bg-white hover:text-black transform hover:scale-105 transition-all duration-300"
              >
                View Services
              </Button>
            </div>

            {/* Contact Info in Hero */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-sm md:text-base animate-slide-up-delay-2">
              <div className="flex items-center justify-center space-x-2">
                <Phone className="h-4 w-4 text-red-500" />
                <span>(289) 952-7018</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="text-center">Unit #111, 50 Sunny Meadow Blvd, Brampton, ON</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-4 w-4 text-red-500" />
                <span>Wed-Sat: 10am-7pm | Sun-Mon: 10am-6pm | Tue: CLOSED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Professional barbering services tailored to your style and preferences
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Scissors className="h-5 w-5 mr-2 text-red-600" />
                  Classic Haircut
                </CardTitle>
                <CardDescription>$25</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Traditional scissor cut with attention to detail and personal style preferences.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Scissors className="h-5 w-5 mr-2 text-red-600" />
                  Beard Trim & Shape
                </CardTitle>
                <CardDescription>$20</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Professional beard trimming and shaping to complement your facial structure.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Scissors className="h-5 w-5 mr-2 text-red-600" />
                  Hot Towel Shave
                </CardTitle>
                <CardDescription>$30</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Luxurious traditional straight razor shave with hot towel treatment.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Scissors className="h-5 w-5 mr-2 text-red-600" />
                  Fade Cut
                </CardTitle>
                <CardDescription>$28</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Modern fade cuts including high, mid, and low fades with precision blending.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Scissors className="h-5 w-5 mr-2 text-red-600" />
                  Kids Cut
                </CardTitle>
                <CardDescription>$18</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Patient and gentle haircuts for children in a comfortable environment.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Scissors className="h-5 w-5 mr-2 text-red-600" />
                  Full Service
                </CardTitle>
                <CardDescription>$45</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Complete grooming package including cut, wash, beard trim, and styling.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">About Rozer's Barber Station</h2>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                Since opening our doors in 2016, Rozer's Barber Station has been proudly serving the Brampton community
                with exceptional grooming services that blend traditional barbering techniques with modern styling. Our
                commitment to quality craftsmanship, attention to detail, and customer satisfaction has made us a
                trusted destination for men seeking the finest haircuts, beard trims, and hot towel shaves. We pride
                ourselves on creating a welcoming atmosphere where every client feels comfortable and leaves looking
                their absolute best, while our skilled and licensed barbers stay updated with the latest trends while
                honoring classic techniques.
              </p>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  8+ Years Experience
                </Badge>
                <Badge variant="secondary" className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  Licensed Professionals
                </Badge>
              </div>
            </div>
            <div className="flex justify-center">
              <Image
                src="/images/rozers-logo.jpg"
                alt="Rozer's Barber Station Logo"
                width={96}
                height={96}
                className="rounded-full aspect-square object-cover shadow-2xl w-24 h-24 md:w-72 md:h-72"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Employees Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our skilled and experienced barbers are dedicated to providing you with the best grooming experience
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <Image
                    src="/images/barber-placeholder.jpg"
                    alt="Team Member"
                    fill
                    className="object-cover rounded-full"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Rozer</h3>
                <p className="text-red-600 font-semibold mb-2">Master Barber & Owner</p>
                <p className="text-gray-600 text-sm">
                  15+ years of experience specializing in classic cuts and modern styles
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <Image
                    src="/images/barber-placeholder.jpg"
                    alt="Team Member"
                    fill
                    className="object-cover rounded-full"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Sunny</h3>
                <p className="text-red-600 font-semibold mb-2">Senior Barber</p>
                <p className="text-gray-600 text-sm">
                  Expert in fade cuts and beard styling with 8+ years of experience
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <Image
                    src="/images/barber-placeholder.jpg"
                    alt="Team Member"
                    fill
                    className="object-cover rounded-full"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Navi</h3>
                <p className="text-red-600 font-semibold mb-2">Professional Barber</p>
                <p className="text-gray-600 text-sm">Skilled in traditional techniques and contemporary styling</p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <Image
                    src="/images/barber-placeholder.jpg"
                    alt="Team Member"
                    fill
                    className="object-cover rounded-full"
                  />
                </div>
                <h3 className="text-xl font-bold mb-2">Prabh</h3>
                <p className="text-red-600 font-semibold mb-2">Professional Barber</p>
                <p className="text-gray-600 text-sm">Passionate about precision cuts and customer satisfaction</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">What Our Customers Say</h2>
          </div>
          <GoogleReviews />
        </div>
      </section>

      {/* Location & Contact Section */}
      <section id="contact" className="py-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Visit Us</h2>
            <p className="text-gray-600">Get a fresh cut, shave, or beard trim at Rozer's Barber Station!</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Google Maps */}
            <div className="h-96 rounded-lg overflow-hidden shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2879.8!2d-79.7624!3d43.7315!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b15eaa5d05abf%3A0x352d5b8f5c5b5c5b!2s50%20Sunny%20Meadow%20Blvd%2C%20Brampton%2C%20ON!5e0!3m2!1sen!2sca!4v1234567890&maptype=satellite"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Rozer's Barber Station Location"
              ></iframe>
            </div>

            {/* Contact Info & Booking Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Book Your Appointment</CardTitle>
                  <CardDescription>Schedule your visit today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <BookingForm />
                </CardContent>
              </Card>

              {/* Contact Information */}
              <div className="mt-8 space-y-4">
                <div className="flex justify-center mb-6">
                  <Image
                    src="/images/rozers-logo.jpg"
                    alt="Rozer's Barber Station Logo"
                    width={48}
                    height={48}
                    className="rounded-full aspect-square object-cover w-12 h-12 md:w-20 md:h-20"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-red-600" />
                  <span>Unit #111, 50 Sunny Meadow Blvd, Brampton, ON</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-red-600" />
                  <span>(289) 952-7018</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-red-600" />
                  <span>rozerbarber@gmail.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-red-600" />
                  <div>
                    <p>Wed-Sat: 10:00 AM - 7:00 PM</p>
                    <p>Sun-Mon: 10:00 AM - 6:00 PM</p>
                    <p className="text-red-600 font-semibold">Tuesday: CLOSED</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-8">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Image
                src="/images/rozers-logo.jpg"
                alt="Rozer's Barber Station Logo"
                width={32}
                height={32}
                className="rounded-full aspect-square object-cover w-8 h-8 md:w-8 md:h-8"
              />
              <span className="text-xl font-bold">Rozer's Barber Station</span>
            </div>
            <div className="text-center md:text-right">
              <p>&copy; 2024 Rozer's Barber Station. All rights reserved.</p>
              <p className="text-sm text-gray-400 mt-1">Professional barbering services since 2009</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function GoogleReviews() {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/google-reviews')
      .then(res => res.json())
      .then(setReviews);
  }, []);

  if (!reviews.length) return <p>Loading reviews...</p>;

  // Remove date display
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 min-w-full">
        {reviews.slice(0, 10).map((review, idx) => (
          <Card key={idx} className="min-w-[320px] max-w-xs flex-shrink-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{review.author_name}</CardTitle>
                </div>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">"{review.text}"</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
