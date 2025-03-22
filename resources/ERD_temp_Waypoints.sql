-- Exported from QuickDBD: https://www.quickdatabasediagrams.com/
-- Link to schema: https://app.quickdatabasediagrams.com/#/d/YmTQEe
-- NOTE! If you have used non-SQL datatypes in your design, you will have to change these here.


CREATE TABLE "Overview" (
    "id" Integer   NOT NULL,
    "name" TEXT   NOT NULL,
    "lat" Float   NOT NULL,
    "lng" Float   NOT NULL,
    "start_date" Date   NOT NULL,
    "end_date" Date   NOT NULL,
    "duration_days" Integer   NOT NULL,
    "visit_type" TEXT   NOT NULL,
    "photo_album" TEXT   NOT NULL,
    "photos" TEXT   NOT NULL,
    "description" TEXT   NOT NULL,
    "notes" Text   NOT NULL,
    "importance" Integer   NOT NULL,
    "estimated" Boolean   NOT NULL,
    CONSTRAINT "pk_Overview" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "Pictures" (
    "picture_id" int   NOT NULL,
    "file_name" TEXT   NOT NULL,
    "file_location" TEXT   NOT NULL,
    "picture_name" TEXT   NOT NULL,
    "caption" TEXT   NOT NULL,
    "overview_id" int   NOT NULL,
    "location_id" int   NOT NULL,
    CONSTRAINT "pk_Pictures" PRIMARY KEY (
        "picture_id"
     )
);

CREATE TABLE "Location" (
    "location_id" int   NOT NULL,
    "name" TEXT   NOT NULL,
    "lat" float   NOT NULL,
    "lng" float   NOT NULL,
    "overview_id" int   NOT NULL,
    CONSTRAINT "pk_Location" PRIMARY KEY (
        "location_id"
     )
);

CREATE TABLE "Routes" (
    "route_id" Integer   NOT NULL,
    "start_location_id" int   NOT NULL,
    "end_location_id" int   NOT NULL,
    "transport_mode" TEXT   NOT NULL,
    "travel_date" Date   NOT NULL,
    "usage_tags" TEXT   NOT NULL,
    CONSTRAINT "pk_Routes" PRIMARY KEY (
        "route_id"
     )
);

CREATE TABLE "Activity" (
    "activity_id" Integer   NOT NULL,
    "location_id" int   NOT NULL,
    "activity_type" TEXT   NOT NULL,
    "route_path" TEXT   NOT NULL,
    "description" TEXT   NOT NULL,
    "notes" Text   NOT NULL,
    CONSTRAINT "pk_Activity" PRIMARY KEY (
        "activity_id"
     )
);

CREATE TABLE "Trip" (
    "trip_id" int   NOT NULL,
    "trip_name" TEXT   NOT NULL,
    "trip_description" TEXT   NOT NULL,
    "trip_start_date" datetime   NOT NULL,
    "trip_end_date" datetime   NOT NULL,
    "overview_id" int   NOT NULL,
    CONSTRAINT "pk_Trip" PRIMARY KEY (
        "trip_id"
     )
);

CREATE TABLE "TripLocation" (
    "trip_id" INT NOT NULL,
    "location_id" INT NOT NULL,
    "sequence" INT NOT NULL,
    CONSTRAINT "pk_TripLocation" PRIMARY KEY ("trip_id", "location_id"),
    CONSTRAINT "fk_TripLocation_trip_id" FOREIGN KEY ("trip_id") REFERENCES "Trip" ("trip_id"),
    CONSTRAINT "fk_TripLocation_location_id" FOREIGN KEY ("location_id") REFERENCES "Location" ("location_id")
);

CREATE TABLE "PictureLocation" (
    "picture_id" INT NOT NULL,
    "location_id" INT NOT NULL,
    CONSTRAINT "pk_PictureLocation" PRIMARY KEY ("picture_id", "location_id"),
    CONSTRAINT "fk_PictureLocation_picture_id" FOREIGN KEY ("picture_id") REFERENCES "Pictures" ("picture_id"),
    CONSTRAINT "fk_PictureLocation_location_id" FOREIGN KEY ("location_id") REFERENCES "Location" ("location_id")
);

ALTER TABLE "Pictures" ADD CONSTRAINT "fk_Pictures_overview_id" FOREIGN KEY("overview_id")
REFERENCES "Overview" ("id");

ALTER TABLE "Pictures" ADD CONSTRAINT "fk_Pictures_location_id" FOREIGN KEY("location_id")
REFERENCES "Location" ("location_id");

ALTER TABLE "Location" ADD CONSTRAINT "fk_Location_overview_id" FOREIGN KEY("overview_id")
REFERENCES "Overview" ("id");

ALTER TABLE "Routes" ADD CONSTRAINT "fk_Routes_start_location_id" FOREIGN KEY("start_location_id")
REFERENCES "Location" ("location_id");

ALTER TABLE "Routes" ADD CONSTRAINT "fk_Routes_end_location_id" FOREIGN KEY("end_location_id")
REFERENCES "Location" ("location_id");

ALTER TABLE "Activity" ADD CONSTRAINT "fk_Activity_location_id" FOREIGN KEY("location_id")
REFERENCES "Location" ("location_id");

ALTER TABLE "Trip" ADD CONSTRAINT "fk_Trip_overview_id" FOREIGN KEY("overview_id")
REFERENCES "Overview" ("id");

ALTER TABLE "TripLocation" ADD CONSTRAINT "fk_TripLocation_trip_id" FOREIGN KEY("trip_id")
REFERENCES "Trip" ("trip_id");

ALTER TABLE "TripLocation" ADD CONSTRAINT "fk_TripLocation_location_id" FOREIGN KEY("location_id")
REFERENCES "Location" ("location_id");

ALTER TABLE "PictureLocation" ADD CONSTRAINT "fk_PictureLocation_picture_id" FOREIGN KEY("picture_id")
REFERENCES "Pictures" ("picture_id");

ALTER TABLE "PictureLocation" ADD CONSTRAINT "fk_PictureLocation_location_id" FOREIGN KEY("location_id")
REFERENCES "Location" ("location_id");

