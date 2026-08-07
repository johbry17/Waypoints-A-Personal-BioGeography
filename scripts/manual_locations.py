# manually set lng/lat here, for use in extract_data.py
# format: "Routes spreadsheet location name": (longitude, latitude)
LOCATIONS = {
    "Fish River Canyon": (17.614818, -27.589350),  # Fish River Canyon
    "N7 to Noordoewer Border Post": (17.830023, -29.020174),
    "N7 again to Noordoewer Border Post": (17.697956, -28.843831),
    "Border Posts - Vioolsdrift": (17.626150, -28.770706),
    "Sesriem": (15.803785, -24.491391),  # Sesriem
    "Sesriem Canyon": (15.803785, -24.491391),  # Sesriem Canyon
    "Kokerboomwoud": (18.241756, -26.481496),  # Kokerboomwoud
    "Deadvlei": (15.322147, -24.729733),  # Deadvlei
    "Dune 45": (15.471035, -24.723004),  # Dune 45
    "Giant's Playground": (18.270635, -26.464834),  # Giant's Playground
    "Keetmanshoop": (18.138505, -26.585550),  # Keetmanshoop
    "Helmeringhausen": (16.821412, -25.889119),  # Helmeringhausen
    "Letras Todos Santos": (-110.225647, 23.450065),  # Letras Todos Santos
    "Universidad para la Paz": (-84.272779, 9.919265),  # Universidad para la Paz
    "Montreal": (-73.567256, 45.501688),  # Montreal
    "Paris": (2.3483915, 48.8534951),  # Paris
    "Brussels": (4.352548, 50.846666),  # Brussels
    "London": (-0.074640, 51.506930),  # London
    "Edinburgh": (-3.1883749, 55.9533456),  # Edinburgh
    "Mallaig, UK": (-5.829646, 57.003919),  # Mallaig, Scotland
    "Inverness": (-4.224254, 57.479158),  # Inverness
    "Cape Town": (18.424024, -33.925127),  # Cape Town
    "Cusco": (-71.979577, -13.516515),  # Cusco
    "Ollantaytambo": (-72.263261, -13.258440),  # Ollantaytambo
    "Pisac": (-71.841230, -13.405338),  # Pisac
    "Calicut Airport": (75.951776, 11.140074),  # Calicut Airport
    "Fort Cochin": (76.278355, 9.972701),  # Fort Cochin
    "Bangalore": (77.569744, 12.977825),  # Bangalore
    "Alleppey": (76.346937,9.499852),  # Alleppey
    "Mysore": (76.652643, 12.310123),  # Mysore
    "Gokarna": (74.318296, 14.519395),  # Gokarna
    "Anjuna": (73.737638, 15.584436),  # Anjuna
    "Agra": (78.038945, 27.171074),  # Agra
    "Fatehpur Sikri": (77.662817, 27.093647),  # Fatehpur Sikri
    "Jodhpur": (73.041149, 26.298086),  # Jodhpur
    "Arna Jharna Thar Desert Museum": (72.894706, 26.29725),  # Arna Jharna Thar Desert Museum
    "Cheend": (76.141412, 27.329585),  # Cheend
    "Kukdela": (76.113505, 27.399342),  # Kukdela
    "Alwar": (76.588109, 27.574986),  # Alwar
    "Jawanpura": (76.046901, 27.431497),  # Jawanpura
    "Gaurav Tower": (75.806624, 26.855001),  # Gaurav Tower
    "Jaipur": (75.820505, 26.915956),  # Jaipur
    "Gurudwara": (74.876279, 31.621333),  # Gurudwara
    "New Delhi": (77.219048, 28.642640),  # New Delhi
    "Amritsar": (74.867140, 31.633485),  # Amritsar
    "Lahaina": (-156.679755, 20.875259),  # Lahaina
    "Clinton, WA": (-122.351728, 47.974763),  # Clinton, WA
    "Tonasket Barter Faire": (-119.233143, 48.682265),  # Tonasket Barter Faire
    "Ocean Park, WA": (-124.043324, 46.607045),  # Ocean Park, WA
    "Big Tree Wayside": (-124.014675, 41.373243),  # Big Tree Wayside
    "Hinsdale": (-87.921266, 41.805970),  # Hinsdale
    "Chicago": (-87.6244212, 41.8755616),  # Chicago
    "New Orleans": (-90.067748, 29.956294),  # New Orleans
    "Washington, DC": (-77.006353, 38.896850),  # Washington, DC
    "Playa El Tecolote": (-110.315244, 24.336272),  # Playa El Tecolote
    "Chunyaxché": (-87.613734, 20.078838),  # Chunyaxché
    "Chichén-Itzá": (-88.572570, 20.683086),  # Chichén-Itzá
    "Coba, Mexico": (-87.733341, 20.491103),  # Coba, Mexico
    "Tulum Ruins": (-87.436921, 20.217326),  # Tulum Ruins
    "Tulum, Mexico": (-87.465124, 20.210958),  # Tulum, Mexico
    "Sian Ka'an": (-87.481675, 20.051861),  # Sian Ka'an
    "Ferry Bocas": (-82.401533, 9.291927),  # Ferry Bocas
    "Suretka": (-82.935778, 9.565407),  # Suretka
    "Puerto Viejo de Talamanca, Costa Rica": (-82.755807, 9.656754),  # Puerto Viejo de Talamanca
    "Sixaola-Guabito International Bridge": (-82.613864, 9.500090),  # Sixaola-Guabito International Bridge
    "Sixaola": (-82.614219, 9.501049),  # Sixaola
    "Agujitas de Drake": (-83.666721, 8.690276),  # Agujitas de Drake
    "Manuel Antonio": (-84.147215, 9.389281),  # Manuel Antonio
    "Quepos": (-84.161592, 9.430187),  # Quepos
    "Montezuma": (-85.067928, 9.654687),  # Montezuma
    "Paquera": (-84.903707, 9.830126),  # Paquera
    "Puntarenas": (-84.848659, 9.978001),  # Puntarenas
    "Poas Volcano": (-84.237554, 10.182342),  # Poas Volcano
    "Rio Celeste": (-84.987401, 10.716275),  # Rio Celeste
    "Rincon de la Vieja": (-85.349777, 10.773067),  # Rincon de la Vieja
    "Santa Rosa": (-85.665756, 10.779104),  # Santa Rosa
    "Ometepe Ferry": (-85.789179, 11.460819),  # Ometepe Ferry
    "Independence, Belize": (-88.416825, 16.543831),  # Independence, Belize
    "Belize City, Belize": (-88.184810, 17.494329),  # Belize City, Belize
    "Flores, Guatemala": (-89.893485, 16.928492),  # Flores, Guatemala
    "Tikal": (-89.676419, 17.117355),  # Tikal
    "Lago Atitlan": (-91.163139, 14.741297),  # Lago Atitlan
    "Tajumulco": (-91.870116, 15.073828),  # Tajumulco
}