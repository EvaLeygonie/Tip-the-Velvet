# Pandaemonium – door shifts, option A

Decision (2026-10-19): 8 volunteers confirmed. Everyone works 1 hour at the door, as two 30-minute shifts: **one before 21:00 and one after 21:00**. Katherine, Sophie and Sam come off the schedule.

## The numbers

The door has 16 half-hour spots (8 hours): 8 before 21:00 (two at a time), then 8 single spots.

The show is 21:00–22:00 and 22:30–23:30, so the show spots are 21:00, 21:30, 22:30 and 23:00. 22:00 is the break; 23:30 onwards is the dancefloor.

With 8 volunteers the 8 early and 8 later spots fill exactly, one of each per person. Krister and Sam are free, or a buffer if someone drops out. (Krister's hand-added spots at 20:00, 20:30 and 00:30 take spots from the volunteers, so remove or reduce them in the admin.)

## Text above the booking table

**Swedish**

> Alla jobbar en timme i dörren, uppdelat på två pass på 30 minuter: ett före 21:00 och ett efter 21:00. Så delar vi på de lättaste timmarna.

**English**

> Everyone works one hour at the door, split into two 30-minute shifts: one before 21:00 and one after 21:00. That way we share the easiest hours.

## Email

### Swedish

Ämne: Uppdaterat dörrschema – välj dina pass

Hej {name},

Först och främst: ursäkta att dörrschemat skickades ut av misstag innan det var klart. Det var inte meningen, och jag förstår att det kan ha skapat förvirring.

För att göra det så rättvist som möjligt har jag gjort om schemat till pass på 30 minuter. De första två timmarna (19–21) är de roligaste: då är ni två i dörren, det kommer många gäster och du missar bara mingel. Därför får alla boka en halvtimme mellan 19 och 21, och en halvtimme efter 21, då du står själv och missar mer av kvällen. Totalt blir det en timme var.

Du som hann välja ett pass innan schemat togs ner behåller din tid, men bara den första halvtimmen, så du behöver välja ytterligare ett pass på 30 minuter.

Du som står under showen (21:00, 21:30, 22:30 eller 23:00) får stå vid sidodörren till scenen, så du har fortfarande bra utsikt och förhoppningsvis inte så många gäster som kommer in.

Välj dina pass här: {link}

Jag skriver ut schemat så att det finns i entrén. Där står namn och telefonnummer under varje pass, så att du kan nå nästa person om ditt pass är slut och den inte har kommit. Vill du inte att ditt nummer syns på pappret, skriv till mig så tar jag bort det.

Tack för att du ställer upp och hjälper till! Hör av dig om något inte funkar!

Varma hälsningar,
Eva

### English

Subject: Updated door schedule – pick your shifts

Hi {name},

First of all: I'm sorry that the door schedule was sent out by mistake before it was ready. That was not the intention, and I understand it may have caused some confusion.

To make it as fair as possible, I have changed the schedule to 30-minute shifts. The first two hours (19–21) are the most fun: there are two of you at the door, lots of guests arrive, and you only miss the mingling. So everyone gets to book one half hour between 19 and 21, and one half hour after 21, when you are on your own and miss more of the evening. That makes one hour each in total.

If you managed to pick a shift before the schedule was taken down, you keep your time, but only the first half hour, so you need to pick one more 30-minute shift.

If you are working during the show (21:00, 21:30, 22:30 or 23:00), you stand at the side door to the stage, so you still have a good view and hopefully not many guests arriving.

Pick your shifts here: {link}

I will print the schedule so it is at the entrance. It lists names and phone numbers under each shift, so you can reach the next person if your shift is over and they haven't arrived. If you don't want your number on the paper, write to me and I will remove it.

Thank you for helping us out! Let me know if anything doesn't work!

Warm regards,
Eva

## To change in the code once the text is final

1. Booking text above the table (`doorBookingInfo` in `src/lib/eventInfo.ts`): the two texts above.
2. Door report (`buildDoorReport`, `buildDoorNeed`): everyone needs 60 minutes, one before and one after 21:00; a show shift no longer counts as "done" on its own. The setup-volunteer 30-minute exception goes away if Sam, Katherine and Sophie are off.
3. Volunteer page dropdown (`EventInfoHub.tsx`): the existing block on two shifts before 21:00 stays; add the matching block on two shifts after 21:00.
4. Update email (`volunteerDoorUpdateMailDefaults` in `src/lib/mailDefaults.ts`): the email above.
