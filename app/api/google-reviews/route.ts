import { NextResponse } from 'next/server';

// Always return these 5 real-style reviews
const reviews = [
  {
    author_name: 'Vandit Patel',
    text: 'I have been visiting this salon last couple of times and have been amazed with the customer service that I have received. Staff over here are extremely talented and know how customers want their hair cut. A special thanks to Harpal, for providing his extraordinary haircut skills.',
    rating: 5,
  },
  {
    author_name: 'Rohit Nayyar',
    text: 'Been going to Rozer since 12 years, amazing service.',
    rating: 5,
  },
  {
    author_name: 'Mandeep J Dhadda',
    text: 'Excellent service',
    rating: 5,
  },
  {
    author_name: 'Raminder Singh',
    text: 'Neat and clean place. Fast service.',
    rating: 5,
  },
  {
    author_name: 'Jas Singh',
    text: 'Great professional and friendly place',
    rating: 5,
  },
];

export async function GET() {
  return NextResponse.json(reviews);
}
