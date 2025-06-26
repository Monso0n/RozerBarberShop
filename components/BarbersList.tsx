import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export default function BarbersList() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBarbers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('employees').select('*');
      setBarbers(data || []);
      setLoading(false);
    };
    fetchBarbers();
  }, []);

  if (loading) return <div>Loading barbers...</div>;
  if (!barbers.length) return <div>No barbers found.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {barbers.map((barber) => (
        <Card key={barber.id} className="text-center hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <Image
                src={barber.photo_url || "/images/barber-placeholder.jpg"}
                alt={barber.name}
                fill
                className="object-cover rounded-full"
              />
            </div>
            <h3 className="text-xl font-bold mb-2">{barber.name}</h3>
            <p className="text-red-600 font-semibold mb-2">{barber.role || 'Barber'}</p>
            <p className="text-gray-600 text-sm">{barber.bio || ''}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 