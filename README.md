# Waypoints: A GeoBiography
A map of memories, events, and photos in my life

---

This started as a place to store my photos and, in the spirit of data visualization, rapidly answer the question, "Where have you traveled?"

It's rapidly turning into a biography of life highlights.

And, to my surprise, it has turned into quite the little data engineering project. I envisioned plunking down a few markers with a pop-up carousel of photos, but the scope creep has begun. I had no idea I would be building a SQL database. See here:

- [Evolving sketch of project](data_dictionary.md)

## History

Drafted concept. Designed database.

Built map and base layers. 

Added marker and popups overlay. Created Overview data for markers. Pulled from API to csv. Sifted through and added photos. Color-coded and icon-ed markers for life events. Added legend.

Activity overlay. Created location and activity data. Write Activity.location_name and Activity.activity_type, coded to auto-fill (mostly) location.id, lat, lng, activity.id, activity.location_id.