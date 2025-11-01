import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ServiceableCity {
    name: string;
}

export async function GET() {
    const supabase = await createClient();
    
    try {
        const { data, error } = await supabase
            .from('serviceable_cities')
            .select('name')
            .order('name', { ascending: true })
            .returns<ServiceableCity[]>();

        if (error) {
            throw error;
        }

        if (!data) {
            return NextResponse.json([]);
        }

        return NextResponse.json(data.map(city => city.name));
    } catch (error) {
        console.error('Error fetching serviceable cities:', error);
        return NextResponse.json(
            { error: 'Could not fetch serviceable cities.' },
            { status: 500 }
        );
    }
}
