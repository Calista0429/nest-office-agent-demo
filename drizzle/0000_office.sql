CREATE TABLE bookings (id TEXT PRIMARY KEY NOT NULL,scope TEXT NOT NULL,date TEXT NOT NULL,start INTEGER NOT NULL,end INTEGER NOT NULL,seats TEXT NOT NULL,names TEXT NOT NULL,kind TEXT NOT NULL,created TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE slots (scope TEXT NOT NULL,date TEXT NOT NULL,seat TEXT NOT NULL,hour INTEGER NOT NULL,booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,PRIMARY KEY(scope,date,seat,hour));
--> statement-breakpoint
CREATE TABLE booking_operations (scope TEXT NOT NULL,id TEXT NOT NULL,booking_id TEXT NOT NULL,request TEXT NOT NULL,PRIMARY KEY(scope,id));
