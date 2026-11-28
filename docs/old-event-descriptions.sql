-- Longer descriptions for the old events, built only on what the existing texts and
-- event fields already say, plus general description of each theme.
-- Run in the Supabase SQL editor.

begin;

update public.old_events set
  description_sv = 'Ett event på temat Welcome to Venice, på Götehofs festvåning i Göteborg. För en kväll förflyttades festen till Venedig, staden med kanaler, gondoler, karnevaler och mystiska masker. Burlesque, glamour och en nypa italiensk dramatik, arrangerat av Tip the Velvet i maj 2015.',
  description_eng = 'An event on the theme Welcome to Venice, at Götehofs festvåning in Gothenburg. For one evening the party moved to Venice, the city of canals, gondolas, carnivals and mysterious masks. Burlesque, glamour and a dash of Italian drama, arranged by Tip the Velvet in May 2015.'
where slug = '2015-welcome-to-venice';

update public.old_events set
  description_sv = 'Ett event på temat Burlesque Circus, på Götehofs festvåning i Göteborg. Tip the Velvet slog upp cirkustältet i sensommarkvällen och lät manegens värld möta burlesquens: randigt, glittrigt, våghalsigt och lite förföriskt farligt. En kväll i augusti 2015 för alla som någon gång velat rymma med cirkusen.',
  description_eng = 'An event on the theme Burlesque Circus, at Götehofs festvåning in Gothenburg. Tip the Velvet raised the big top on a late summer evening and let the world of the ring meet the world of burlesque: striped, glittering, daring and a little seductively dangerous. A night in August 2015 for anyone who ever wanted to run away with the circus.'
where slug = '2015-burlesque-circus';

update public.old_events set
  description_sv = 'Halloween-fest på temat mörka sagor, plats var Götehofs festvåning i Göteborg. Ivoncita var headliner, konferencier Mystique Luna. Ner genom kaninhålet väntade en kväll där barndomens sagor fick en mörkare ton, med galna tebjudningar, förtrollade skuggor och burlesque på själva allhelgonaaftonen 2015.',
  description_eng = 'Halloween party with the theme of dark tales, held at Götehofs festvåning in Gothenburg. Ivoncita was the headliner, with Mystique Luna as the host. Down the rabbit hole waited a night where childhood stories took a darker turn, with mad tea parties, enchanted shadows and burlesque on Halloween night itself, 2015.'
where slug = '2015-malice-in-wonderland';

update public.old_events set
  description_sv = 'Fest på temat film och galapremiär, på Götehofs festvåning i Göteborg. Headliner var Lady Francesca, konferencier var Klara Kavat. Röda mattan rullades ut för en kväll i filmstjärnornas anda, med gammal Hollywoodglamour, blixtrande premiärkänsla och burlesque som huvudattraktion i februari 2016.',
  description_eng = 'Party themed around film and gala premiere, at Götehofs festvåning in Gothenburg. The headliner was Lady Francesca, and the host was Klara Kavat. The red carpet was rolled out for an evening in the spirit of the movie stars, with old Hollywood glamour, flashing premiere excitement and burlesque as the main attraction in February 2016.'
where slug = '2016-red-carpet-rah-rah';

update public.old_events set
  description_sv = 'All that Burlesque, 20-talsinspirerad fest på Bellmans Salonger i Göteborg i september 2016. Headliner var Maple Rose från Kanada, konferencier var Klara Kavat. Fransar, fjädrar, pärlhalsband och jazzålderns sorglösa nattliv satte tonen för en kväll då det glada tjugotalet fick liv igen på scenen.',
  description_eng = 'All that Burlesque, a 1920s-inspired party at Bellmans Salonger in Gothenburg in September 2016. The headliner was Maple Rose from Canada, and the host was Klara Kavat. Fringe, feathers, strings of pearls and the carefree nightlife of the Jazz Age set the tone for an evening when the Roaring Twenties came back to life on stage.'
where slug = '2016-all-that-burlesque';

update public.old_events set
  description_sv = 'Sjöjungfrur och skeppsbrutna matroser på Valand. Det bjöds på modevisning av Miss Janna, konferencier var Hanna Vagant. Tip the Velvet kastade ankar mitt i Göteborg för en kväll med havet som tema, där sirenernas lockrop, sjömansromantik och burlesque sköljde in över dansgolvet i februari 2017.',
  description_eng = 'Mermaids and shipwrecked sailors at Valand. There was a fashion show by Miss Janna, with Hanna Vagant as the host. Tip the Velvet dropped anchor in the middle of Gothenburg for an evening themed around the sea, where siren songs, sailor romance and burlesque washed in over the dance floor in February 2017.'
where slug = '2017-shipwrecked';

update public.old_events set
  description_sv = 'En hyllning till nattklubben som blev en film som blev en sång som blev en musikal! Frukthattar och guldpalmer! På scen bland annat Ivoncita och Los Copihues. Valand i Göteborg förvandlades i september 2017 till en tropisk nattklubb, med latinska rytmer, showgirlglamour och burlesque under palmerna.',
  description_eng = 'A tribute to the nightclub that became a movie that became a song that became a musical! Fruit hats and gold palm trees! On stage, among others, Ivoncita and Los Copihues. In September 2017, Valand in Gothenburg was turned into a tropical nightclub, with Latin rhythms, showgirl glamour and burlesque beneath the palms.'
where slug = '2017-crazy-for-the-copacabana';

update public.old_events set
  description_sv = 'På den årliga halloween-festen trädde ett hemsökt tivoli fram ur dimmorna. Ett spöklikt följe intog scen med headliners Gita och Harley Queen i spetsen. På Bellmans Salonger i Göteborg möttes gycklare, spågummor och andra väsen från andra sidan i november 2017, för en natt av burlesque där karusellerna snurrade av sig själva.',
  description_eng = 'At the annual Halloween party, a haunted carnival emerged from the fog. A ghostly entourage took the stage with headliners Gita and Harley Queen at the forefront. In November 2017, jesters, fortune tellers and other creatures from the other side gathered at Bellmans Salonger in Gothenburg for a night of burlesque where the carousels turned on their own.'
where slug = '2017-haunted-carnival';

update public.old_events set
  description_sv = 'En hyllning till skogen och de varelser som befolkar den, älvor, fauner och troll. Headliner var Lady Wildflower, platsen var Bellmans Salonger i Göteborg. En vårkväll i april 2018 flyttade den nordiska folktron in i salongerna, med mossa, blomsterkransar och skogsmagi, och burlesquen fick vildvuxna och sagolika uttryck.',
  description_eng = 'A tribute to the forest and the creatures that inhabit it: fairies, fauns and trolls. The headliner was Lady Wildflower, and the venue was Bellmans Salonger in Gothenburg. On a spring evening in April 2018, Nordic folklore moved into the salons, with moss, flower crowns and forest magic, and burlesque took on wild and fairytale forms.'
where slug = '2018-mytiska-vasen';

update public.old_events set
  description_sv = 'Tip the Velvet firade tioårsjubileum med en hyllning till 80-talsskräckisarnas förlovade värld! Swedish Siren & Kandi von Kane var headliners. Bellmans Salonger i Göteborg bjöd på födelsedagskalas med neon, stora frisyrer, filmblod och VHS-nostalgi, en jubileumsfest där tio år av burlesque firades med både skrik och skratt.',
  description_eng = 'Tip the Velvet celebrated its tenth anniversary with a tribute to the enchanted world of 80s horror films! Swedish Siren & Kandi von Kane were the headliners. Bellmans Salonger in Gothenburg hosted a birthday party with neon, big hair, movie blood and VHS nostalgia, an anniversary where ten years of burlesque were celebrated with both screams and laughter.'
where slug = '2018-bloody-burlesque-birthday';

update public.old_events set
  description_sv = 'Tip the Velvet dök ner i steampunkens förunderliga värld! Turbinerna snurrade och luftskeppen gick i skytteltrafik. Mysti Vine och Royal Roses på scen. På Bellmans Salonger i Göteborg mötte viktorianska korsetter och höga hattar kugghjul, mässing och ånga, i en kväll i mars 2019 där historia och framtidsfantasi smälte samman.',
  description_eng = 'Tip the Velvet delved into the wondrous world of steampunk! The turbines spun and the airships ran back and forth. Mysti Vine and Royal Roses on stage. At Bellmans Salonger in Gothenburg, Victorian corsets and top hats met cogwheels, brass and steam on an evening in March 2019 where history and futuristic fantasy melted together.'
where slug = '2019-vistorian-secrets';

update public.old_events set
  description_sv = 'Hjältar och skurkar inom saga, legend och populärkultur var temat! Headliners var Violetta Poison och Skirt Vonnegut. På Bellmans Salonger i Göteborg ställdes gott mot ont i augusti 2019, med mantlar, masker och superkrafter. En kväll där publiken fick fundera på om det inte är skurkarna som har roligast och snyggast kläder.',
  description_eng = 'Heroes and villains in tales, legends and popular culture were the theme! The headliners were Violetta Poison and Skirt Vonnegut. At Bellmans Salonger in Gothenburg, good was pitted against evil in August 2019, with capes, masks and superpowers. An evening that left the audience wondering whether the villains have the most fun and the best outfits.'
where slug = '2019-heroes-and-villains';

update public.old_events set
  description_sv = 'Bellmans Salonger befolkades av varulvar och allsköns monster denna halloween. Headliners var Wanda de Lullabies och Mysti Vine. I november 2019 släpptes odjuret inombords lös i Göteborg, under fullmånens sken, med klor, päls och huggtänder. En burlesquekväll om förvandling och om de vilda sidor vi annars håller i koppel.',
  description_eng = 'Bellmans Salonger was populated by werewolves and all kinds of monsters this Halloween. The headliners were Wanda de Lullabies and Mysti Vine. In November 2019 the beast within was let loose in Gothenburg, under the light of the full moon, with claws, fur and fangs. A burlesque night about transformation and the wild sides we usually keep on a leash.'
where slug = '2019-the-beast-within';

update public.old_events set
  description_sv = 'Tip the Velvet besökte förbudstiden i en saftig cocktail (!) av klassisk burlesque och gangsterestetik. Headliners var Knockout Noire och Yvette les Fesses. Bellmans Salonger i Göteborg förvandlades i januari 2020 till en hemlig lönnkrog, med kritstrecksrandiga kostymer, fjäderboor, fioldlådor med tvivelaktigt innehåll och jazz i luften.',
  description_eng = 'Tip the Velvet visited the Prohibition era in a juicy cocktail (!) of classic burlesque and gangster aesthetics. The headliners were Knockout Noire and Yvette les Fesses. In January 2020, Bellmans Salonger in Gothenburg became a secret speakeasy, with pinstripe suits, feather boas, violin cases with questionable contents and jazz in the air.'
where slug = '2020-gangster-paradise';

update public.old_events set
  description_sv = 'Vår återkomst efter pandemin! Vi firade brunsten, lusten, kärleken, sexdriften, fertiliteten och allt som hör därtill! Headliners var Fräulein Frauke och Liam Teasem. Efter en lång paus öppnade ridån igen på Bellmans Salonger i Göteborg i april 2022, och våren fick bli startskottet för att återigen mötas, flirta, applådera och fira burlesquen tillsammans.',
  description_eng = 'Our return after the pandemic! We celebrated the rut, desire, love, lust, fertility and everything that comes with it! The headliners were Fräulein Frauke and Liam Teasem. After a long break the curtain rose again at Bellmans Salonger in Gothenburg in April 2022, and spring became the starting shot for meeting, flirting, applauding and celebrating burlesque together once more.'
where slug = '2022-spring-re-opening';

update public.old_events set
  description_sv = 'Vi firade häxor av alla kön, trollpackor och trollkarlar som skrattande flyger in i natten, följandes varken Guds eller Djävulens väg utan sin egen! Headliners var Salty Punch och Raven Wine, konferencier var Mysti Vine. Halloweenfesten på Bellmans Salonger i Göteborg i oktober 2022 blev en häxsabbat med magi, kvastar och burlesque.',
  description_eng = 'We celebrated witches of all genders, hags and wizards who laugh and fly into the night, following neither God’s nor the Devil’s path but their own! The headliners were Salty Punch and Raven Wine, and the host was Mysti Vine. The Halloween party at Bellmans Salonger in Gothenburg in October 2022 became a witches’ sabbath of magic, broomsticks and burlesque.'
where slug = '2022-season-of-the-witch';

update public.old_events set
  description_sv = 'Det var tillbaka till 1700-talet för en natt av rokoko n’ roll, enorma klänningar och pudrade peruker. Headliner var Odelia Opium, konferencier var Mike Gamble. På Bellmans Salonger i Göteborg möttes hovets överdåd och rockens attityd i maj 2023, med solfjädrar, korsetter och skönhetsfläckar, och burlesque värdig självaste Amadeus.',
  description_eng = 'Back to the 18th century for a night of rococo n’ roll, enormous dresses and powdered wigs. The headliner was Odelia Opium, and the host was Mike Gamble. In May 2023, courtly extravagance met rock attitude at Bellmans Salonger in Gothenburg, with fans, corsets and beauty marks, and burlesque worthy of Amadeus himself.'
where slug = '2023-rock-me-amadeus';

update public.old_events set
  description_sv = 'Denna halloween bjöd vi på en nattlig bal inspirerad av det märkliga, bisarra, romantiska och fantastiska, allt det som kännetecknar Tim Burtons konstnärskap. A Burtonesque Ball leddes av kvällens värd: den oefterhärmlige Mike Gamble! På Bellmans Salonger i Göteborg dansade randiga gengångare och bleka romantiker i november 2023, i en värld där skevt är vackert.',
  description_eng = 'This Halloween we hosted a night ball inspired by the strange, bizarre, romantic and fantastic, everything that characterises Tim Burton’s artistry. A Burtonesque Ball was led by the evening’s host: the inimitable Mike Gamble! At Bellmans Salonger in Gothenburg, striped ghosts and pale romantics danced in November 2023, in a world where crooked is beautiful.'
where slug = '2023-a-burtonesque-ball';

commit;
