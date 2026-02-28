import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Miljövariabler (lägg in i GitHub secrets)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Städer och filter
const cities = ['Göteborg', 'Partille'];
const genre = 'Rock,Metal,Punk';

// Ticketmaster API
const TICKETMASTER_URL = 'https://app.ticketmaster.com/discovery/v2/events.json';

async function fetchTicketmaster(city) {
  const url = `${TICKETMASTER_URL}?apikey=${TICKETMASTER_API_KEY}&city=${encodeURIComponent(city)}&classificationName=${encodeURIComponent(genre)}&size=50`;
  const res = await fetch(url);
  const data = await res.json();
  return data._embedded?.events || [];
}

async function upsertEvent(event) {
  const {
    id,
    name,
    dates,
    images,
    _embedded,
    url: ticket_url,
  } = event;

  const venue = _embedded?.venues?.[0]?.name || '';
  const city = _embedded?.venues?.[0]?.city?.name || '';
  const date = dates?.start?.dateTime || dates?.start?.localDate || null;
  const image_url = images?.[0]?.url || '';
  const genre = event.classifications?.[0]?.genre?.name || '';
  const subgenre = event.classifications?.[0]?.subGenre?.name || '';
  const tour_name = event.promoter?.name || '';
  const description = `Genre: ${genre}. Subgenre: ${subgenre}.`;

  const { error } = await supabase.from('events').upsert({
    id,
    band_name: name,
    date,
    venue,
    city,
    genre,
    subgenre,
    tour_name,
    description,
    image_url,
    ticket_url,
  }, { onConflict: ['id'] });

  if (error) console.error('Supabase error:', error);
}

async function main() {
  for (const city of cities) {
    console.log(`Fetching events for ${city}...`);
    const events = await fetchTicketmaster(city);
    for (const event of events) {
      await upsertEvent(event);
      console.log(`Saved event: ${event.name}`);
    }
  }
  console.log('Done!');
}

main();