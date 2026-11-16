-- Append versioned original service drafts and conversion planning guides.
do $migration$
declare
  payload constant jsonb := $e34_guides$
[
  {
    "guide": "m50-spark-plug-replacement",
    "revision": "0cc5974e194641ef5a836a4d",
    "content": {
      "slug": "m50-spark-plug-replacement",
      "title": "Replace the M50 or M50TU spark plugs",
      "system": "engine",
      "engines": [
        "M50",
        "M50TU"
      ],
      "level": "Intermediate",
      "kind": "replacement",
      "duration": "45–75 min",
      "summary": "Remove the individual coils, inspect the plug wells and replace the plugs with a verified set for the installed cylinder head.",
      "applicability": "U.S. E34 525i with the original M50 or M50TU coil-on-plug system. Use the correct plugs for the actual head and ignition system.",
      "searchTerms": "spark plug change misfire plugs tune up ignition coil m50 m50tu",
      "tools": [
        "Correct plug set",
        "Spark plug socket and straight extension",
        "Torque wrench",
        "Light and clean vacuum"
      ],
      "cautions": [
        "Work with the engine cold and the ignition off. Confirm the plug maker’s installation and torque instructions for the exact plug, especially dry versus lubricated threads.",
        "Stop for pooled oil, damaged threads or cracked coil boots. Keep debris out of open plug holes."
      ],
      "relatedGuides": [
        "m50-valve-cover-gasket"
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "020-10–020-11, Table f",
        "pdfPages": [
          32,
          33
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Confirm plug fit and reach",
          "body": "Match the plug part number, seat and gap specification to the installed engine. Check the plug maker’s guidance before adjusting a fine-wire electrode.",
          "check": "All six plugs match the application and the correct installation specification is on hand."
        },
        {
          "title": "Expose the coils and record their wiring",
          "body": "Remove the coil cover. Note the connectors, ground straps and brackets. Release the connectors using their catches and lift each coil straight up after removing its hardware. Label the cylinders from the front of the engine.",
          "check": "No coil boot or harness terminal is torn and grounds are accounted for."
        },
        {
          "title": "Inspect each well before removing the plug",
          "body": "Look for standing oil, water and grit. Clean the well before opening it. Use a straight plug socket and extension. Keep the removed plugs in cylinder order if diagnosing a misfire.",
          "check": "The wells are clean and plug condition can be traced to a cylinder."
        },
        {
          "title": "Start threads by hand and seat the plugs",
          "body": "Lower each plug into the well with the socket and start it by hand. If it binds, back it out and inspect the threads. Use the verified torque for the actual plug and thread condition. Bentley lists 30 Nm for its documented installation.",
          "check": "The plugs are seated without cross-threading and tightened to the applicable specification."
        },
        {
          "title": "Reconnect and check idle",
          "body": "Seat each coil boot, refit coil hardware and grounds, latch the connectors and replace the cover. Start the engine and check for a steady idle. If it misfires, shut down and inspect the affected coil connections and plug fit before running it again.",
          "check": "All connectors are latched and there is no new misfire."
        }
      ]
    }
  },
  {
    "guide": "m50-valve-cover-gasket",
    "revision": "734d89877503fec7b5cd2de5",
    "content": {
      "slug": "m50-valve-cover-gasket",
      "title": "Replace the M50 valve-cover gasket",
      "system": "engine",
      "engines": [
        "M50",
        "M50TU"
      ],
      "level": "Intermediate",
      "kind": "replacement",
      "duration": "1–3 hours",
      "summary": "Reseal the factory cam cover and spark plug wells while preserving coil grounds, cover seals and the specified joint treatment.",
      "applicability": "Bentley-covered E34 525i with an original M50/M50TU head and cover. Verify the gasket kit, cover type and applicable sealing points. Oil from above the cover or a damaged cover needs a separate repair.",
      "searchTerms": "valve cover cam cover rocker cover gasket plug wells oil leak m50",
      "tools": [
        "Matching perimeter gasket and spark plug well seals",
        "Correct fastener insulators",
        "Low-range torque wrench",
        "Non-marring scraper"
      ],
      "cautions": [
        "Work cold with the battery isolated according to the vehicle procedure. Keep tools, old gasket and solvent clear of exposed valve gear.",
        "A gasket cannot correct a distorted cover or a damaged sealing face."
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "116-3–116-4, M50 cylinder head cover",
        "pdfPages": [
          101,
          102
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Verify the leak and gather matching seals",
          "body": "Clean the suspected area and trace fresh oil. Identify the perimeter seal, plug-well seals and fastener insulators against the actual cover before disassembly.",
          "check": "The leak points to the cover joint or plug wells and the kit fits the cover."
        },
        {
          "title": "Disconnect cover attachments",
          "body": "Remove the covers and ignition coils. Photograph the ground straps and their studs, release the breather at its fitting, and move the wiring aside with support. Record fastener insulator placement.",
          "check": "The harness, grounds and breather are free without breaking a fitting."
        },
        {
          "title": "Lift the cover and prepare the mating surfaces",
          "body": "Lift the cover evenly and remove the seals. Inspect the cover, plug-well grooves and head joints. Use a non-marring tool and keep old sealant out of the head. Clean and dry the sealing faces.",
          "check": "The groove and surfaces are clean, with no cracks or damaged sealing edge."
        },
        {
          "title": "Install seals and seat the cover",
          "body": "Install the perimeter and well seals without stretching. Use sealant only where the gasket or vehicle instructions specify it. Lower the cover squarely and verify that the rear gasket contour and well seals stay seated.",
          "check": "The gasket remains in the groove all the way around and no wire is trapped."
        },
        {
          "title": "Tighten and confirm the repair",
          "body": "Refit the insulators and tighten the source-matching cover hardware progressively and evenly to the listed 10 Nm. Restore every ground, coil and breather connection. Observe any sealant cure interval, then check the perimeter and wells for fresh oil and recheck after a heat cycle.",
          "check": "The engine runs normally and the repaired seam stays dry."
        }
      ]
    }
  },
  {
    "guide": "m50tu-vanos-diagnosis",
    "revision": "0431eb16ffbf8efa5453bf0c",
    "content": {
      "slug": "m50tu-vanos-diagnosis",
      "title": "Diagnose M50TU single VANOS travel",
      "system": "engine",
      "engines": [
        "M50TU"
      ],
      "level": "Advanced",
      "kind": "inspection",
      "duration": "2–4 hours",
      "summary": "Separate a solenoid command problem, insufficient actuator travel and incorrect mechanical indexing on the E34 single-VANOS system.",
      "applicability": "U.S. E34 525i M50TU with factory single intake VANOS. The engine-off air-actuation test needs the specified tools and polarity. A swapped engine requires its own test specifications.",
      "searchTerms": "vanos rattle ticking no low end power single vanos check solenoid test m50tu timing oil leak",
      "tools": [
        "BMW 11 2 300 TDC pin",
        "BMW 11 3 450 air fitting and regulated air",
        "BMW 12 6 410 test lead",
        "Meter",
        "Caliper or depth gauge",
        "New oil feed seals"
      ],
      "cautions": [
        "Keep the engine off. Remove all locking fixtures before any crank attempt. Confirm electrical polarity at the connector because reversed power can destroy the internal diode.",
        "Use the manual’s regulated-air setup and limits. Contain escaping oil and protect eyes."
      ],
      "relatedGuides": [
        "m50tu-single-vanos-service"
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "117-16–117-18, Figs. 35–37",
        "pdfPages": [
          136,
          137,
          138
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Identify the symptom before taking the engine apart",
          "body": "Confirm a single-VANOS M50TU. Record cold and warm behavior, oil level, timing work and stored DME faults. A rattle or low-end hesitation can have several causes. Check the connector and oil feed for obvious damage first.",
          "check": "Engine, symptom and baseline electrical or oil-feed observations are recorded."
        },
        {
          "title": "Expose the timing reference and lock crank TDC",
          "body": "Remove the coils, cover and intake-cam oil baffle as shown in the source. Rotate the engine by hand to cylinder 1 compression TDC and insert the correct pin into the flywheel or drive plate. Confirm actual engagement.",
          "check": "Crank timing and cylinder 1 lobe position agree and the pin is fully engaged."
        },
        {
          "title": "Connect the air adapter and measure baseline position",
          "body": "Contain oil at the feed fitting. Replace the feed connection temporarily with the manual’s air adapter and regulated supply. Use 30–115 psi at the source’s regulated air fitting. Measure between the trigger plate edge and the same secondary-tensioner reference face shown in Fig. 37.",
          "check": "The setup is stable, pressure is within the source range and the baseline is written down."
        },
        {
          "title": "Command the solenoid and compare travel",
          "body": "Verify polarity at the vehicle plug and through the test lead. Apply the specified test connection and measure again from the identical reference face. Bentley calls for at least 8.5 mm change. Compare click, actual travel and repeatability separately.",
          "check": "The result records both distances and the observed motion, or records why the test stopped."
        },
        {
          "title": "Interpret and restore",
          "body": "A click alone leaves travel unproven. For short travel, inspect solenoid and actuator plunger freedom and verify VANOS indexing before condemning the unit. Depressurize, remove the test equipment and pin, and restore the feed with new seals. Refit the cover, grounds and connectors.",
          "check": "Every fixture is removed. The feed is dry after startup and the next action follows the measurements."
        }
      ]
    }
  },
  {
    "guide": "m50tu-single-vanos-service",
    "revision": "75f682f09bf084394b9f9020",
    "content": {
      "slug": "m50tu-single-vanos-service",
      "title": "Remove and reinstall M50TU single VANOS",
      "system": "engine",
      "engines": [
        "M50TU"
      ],
      "level": "Advanced",
      "kind": "replacement",
      "duration": "Half day",
      "summary": "Lock crank and cams, remove the actuator, engage the helical gear correctly and prove mechanical timing before startup.",
      "applicability": "Factory U.S. E34 M50TU single intake VANOS, original timing drive. Use this with 117-18–20 and its figures at the bench. Internal actuator seal replacement is a separate bench operation.",
      "searchTerms": "vanos replacement rebuild seals removal install m50tu intake cam timing lock spline",
      "tools": [
        "BMW 11 2 300 crank pin",
        "BMW 11 3 240 camshaft alignment fixture",
        "BMW 11 3 390 dummy tensioner",
        "E10 socket",
        "Low-range torque tools",
        "New actuator gasket and applicable seals"
      ],
      "cautions": [
        "Incorrect cam timing can cause valve-to-piston contact. Stop if the locks will not locate, the chain is slack or the crank resists hand rotation.",
        "The primary tensioner plug retains a spring. Use the source order and confirm torques for all fasteners. Bentley’s access-plug metric and imperial values disagree."
      ],
      "evidence": [
        {
          "label": "Beisan Systems single VANOS bench-seal procedure",
          "href": "https://beisansystems.com/single-vanos-6-cyl-e36-e34-e39/"
        }
      ],
      "relatedGuides": [
        "m50tu-vanos-diagnosis",
        "m50tu-vanos-piston-seals",
        "m50-valve-cover-gasket"
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "117-18–117-20, Figs. 38–40; 116-3–116-4",
        "pdfPages": [
          101,
          102,
          138,
          139,
          140
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Expose the actuator and set cylinder 1 compression TDC",
          "body": "Isolate the battery and remove coil and cover hardware, oil baffle and the rear studs called out by Bentley. Rotate the crank by hand in its normal direction. Check damper mark and cam lobes, then engage the crank pin and cam blocks.",
          "check": "Both locking tools locate at the same compression TDC without being forced."
        },
        {
          "title": "Release the secondary sprocket and remove the unit",
          "body": "Disconnect the oil feed and connector, catch the oil and remove the two access plugs. With timing locked, loosen the four E10 sprocket fasteners through the access points. Compress and pin the secondary tensioner as shown in Fig. 39. Remove the housing fasteners and slide the actuator forward. Stop if it will not release without force.",
          "check": "The cam and crank stayed locked, the secondary tensioner is pinned and the unit came away without prying."
        },
        {
          "title": "Set the installation preload arrangement",
          "body": "Confirm the locks, loose sprocket screws and pinned secondary tensioner. Carefully substitute the dummy primary tensioner and take up slack according to Fig. 40. Clean the mating surface and place the new gasket. Apply the source-specified sealant at the alignment dowels.",
          "check": "The chain has controlled slack and the gasket and dowels are correctly seated."
        },
        {
          "title": "Engage the first available spline",
          "body": "Bottom the piston cup in its housing. Slide the unit inward to engage the internal splines first. Viewed from the front, turn the secondary sprockets to the clockwise stop. Maintain inward pressure and move them counterclockwise only enough to engage the outer splines, then seat the unit.",
          "check": "The housing seats flush without using the nuts to draw it into engagement."
        },
        {
          "title": "Set chain preload and secure the timing",
          "body": "Torque the factory housing’s M6 nuts to 10 Nm and its M8 bolt to 22 Nm. Restore the oil feed with fresh seals and tighten its union to 32 Nm. Release the secondary tensioner and set the dummy primary tensioner to Bentley’s 1.3 Nm. Tighten the four sprocket fasteners alternately in the specified 5 Nm and 22 Nm stages for this M50TU.",
          "check": "The housing and sprocket fasteners are secure and the correct preload was used."
        },
        {
          "title": "Prove timing by hand before reassembly",
          "body": "Remove both locks, turn the crank by hand through at least two full turns and recheck both locks at compression TDC. Stop if either fixture fails to locate. Remove the locks, restore the production tensioner with its piston engaged on the rail and fit the access plugs with verified torque and new seals.",
          "check": "Both locks fit again after rotation, all fixtures are out and the running tensioner is installed."
        },
        {
          "title": "Restore the cover and check oil feed and operation",
          "body": "Reinstall the oil baffle, cover, coil grounds, breather and wiring. Inspect the feed fitting before and after startup. If the timing or operation is in doubt, repeat the engine-off travel test before putting the car back in service.",
          "check": "There is no fresh leak or new abnormal noise and VANOS operation has a documented check."
        }
      ]
    }
  },
  {
    "guide": "m20-timing-belt",
    "revision": "654e9a93bfa07f8ef70c3a30",
    "content": {
      "slug": "m20-timing-belt",
      "title": "Replace the M20 timing belt and tensioner",
      "system": "engine",
      "engines": [
        "M20"
      ],
      "level": "Advanced",
      "kind": "replacement",
      "duration": "Half day",
      "summary": "Expose the factory belt drive, establish cylinder 1 TDC, install the belt with slack at the tensioner and verify the marks through two turns.",
      "applicability": "U.S. 1989–90 E34 525i with the original M20 timing drive. The M50 uses a chain. Confirm the exact belt, tensioner and cooling-system components before removing anything.",
      "searchTerms": "m20 timing belt cam belt cambelt tensioner water pump timing marks replacement",
      "tools": [
        "Matched belt and tensioner",
        "22 mm crank socket for source hardware",
        "Fan wrench and pulley holder",
        "Torque wrench",
        "Coolant recovery pan"
      ],
      "cautions": [
        "The M20 is an interference engine. Stop for timing marks that will not agree, a broken belt or crank resistance. Avoid moving crank and cam independently with the belt removed.",
        "Work with a cold cooling system and a verified refill/bleed procedure. The fan coupling uses a left-hand thread on this installation."
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "118-1–118-4, Figs. 1–8; 170-5",
        "pdfPages": [
          141,
          142,
          143,
          144,
          209
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Prepare access and retain the belt routing record",
          "body": "Disconnect the battery. On a cold engine, capture the coolant and remove the radiator and fan using the appropriate cooling chapter. Record hose and belt routing. Remove the coolant crossover, accessory belts, pulley and the distributor/rotor and brackets that obstruct the timing covers as shown in 118-1–2.",
          "check": "The work area is clear and fasteners, ignition leads and hose positions are labeled."
        },
        {
          "title": "Set and photograph the original timing marks",
          "body": "Remove the upper cover. Turn the crank by its center bolt in the normal direction until the cam sprocket mark and crank TDC mark agree. Remove the peripheral pulley/damper bolts and lower cover as shown. Confirm the crank hub mark against the front cover with the damper removed.",
          "check": "Cam and crank references both indicate cylinder 1 TDC."
        },
        {
          "title": "Unload the old belt and inspect the drive",
          "body": "Loosen the specified tensioner fixings. Push the spring tensioner back and lock it temporarily with the upper bolt. Remove the old belt without moving the sprockets. Control the spring as you remove the old tensioner. On the replacement, seat the spring in both the tensioner hole and the water-pump detent shown in Fig. 6. Inspect the sprockets and pump area for wear, play and leakage.",
          "check": "The timing marks have stayed in position and the tensioner spring and pivot seat correctly."
        },
        {
          "title": "Fit the new belt and release the tensioner",
          "body": "Start at the crank and route counterclockwise around the intermediate and cam sprockets, finishing at the tensioner. Keep the driven span taut and all slack at the tensioner. Release the upper fixing slowly to let the spring take up slack.",
          "check": "The belt teeth are fully seated, the spring is engaged and both marks remain aligned."
        },
        {
          "title": "Hand-turn twice and confirm the marks",
          "body": "Turn the crank clockwise through two complete revolutions using the center bolt. Stop if it binds. At TDC, both marks must agree. Refit the belt if they do not. Tighten the documented tensioner mounting bolts to 22 ± 2 Nm once the marks are correct.",
          "check": "Timing agrees after hand rotation and the tensioner is secured."
        },
        {
          "title": "Reassemble, refill and check for leaks",
          "body": "Seat the damper on its locating pin and refit covers, pulleys, distributor, hoses, accessory belts and fan. Use the appropriate fastener sizes and values in the manual. Refill and bleed using the matched M20 cooling procedure. Confirm no tools remain, then check operation, leakage and temperature.",
          "check": "The car warms normally with no coolant loss or abnormal belt noise."
        }
      ]
    }
  },
  {
    "guide": "e34-cabin-filter-replacement",
    "revision": "6ecc4a024e44fbd1ba41d5ff",
    "content": {
      "slug": "e34-cabin-filter-replacement",
      "title": "Replace the HVAC cabin microfilter",
      "system": "electrical",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Intermediate",
      "kind": "replacement",
      "duration": "45–90 min",
      "summary": "Reach the filter from the glovebox side, remove debris and restore the duct and trim without opening the refrigerant system.",
      "applicability": "Source-matching left-hand-drive E34 with the cabin microfilter housing. Bentley’s maintenance section points to 1991 and later cars. Confirm the housing and access arrangement first.",
      "searchTerms": "cabin air filter pollen microfilter micro filter hvac clogged musty weak vents change",
      "tools": [
        "Correct microfilter",
        "Trim tool",
        "Screwdrivers",
        "Small vacuum",
        "Light"
      ],
      "cautions": [
        "Follow the battery isolation and airbag precautions before working around passenger-side trim. If the access path would disturb an SRS component or connector, stop and use the matching manual procedure."
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "020-19; 513-4; 640-13, Fig. 30",
        "pdfPages": [
          41,
          360,
          425
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Confirm the filter housing",
          "body": "Find the matching filter cover in the source and compare your HVAC housing. Note the shape and flow orientation of the replacement element.",
          "check": "The installed case has the service cover and the new element matches."
        },
        {
          "title": "Make space at the glovebox and center console",
          "body": "Remove the glovebox following 513-4 and support any light wiring. Remove the carpeted side trim fasteners and the panel above the glovebox. Keep screws sorted by position.",
          "check": "The duct is accessible and wiring is neither trapped nor carrying the panel weight."
        },
        {
          "title": "Remove the duct and open the housing",
          "body": "Remove the two documented ventilation duct screws and take the duct out of the access path. Release the microfilter cover. Slide the element out and note its orientation.",
          "check": "The old filter is clear of the case and the cover clips are intact."
        },
        {
          "title": "Seat the replacement and verify air delivery",
          "body": "Vacuum accessible debris without pushing it into the evaporator. Seat the filter in the intended direction. Restore the cover, duct, trim and glovebox, reconnect anything isolated and test the blower and vent selection.",
          "check": "The filter cover seals, the duct is seated and airflow returns without trim interference."
        }
      ]
    }
  },
  {
    "guide": "hood-support-struts",
    "revision": "00a704a627350615b71b6596",
    "content": {
      "slug": "hood-support-struts",
      "title": "Replace the hood support struts",
      "system": "body",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Beginner",
      "kind": "replacement",
      "duration": "20–40 min",
      "summary": "Support the hood independently, release each end clip and verify both struts are locked onto their mounting studs.",
      "applicability": "Bentley-covered E34 with the original clip-retained hood gas struts. Match the replacement length, end fittings and orientation.",
      "searchTerms": "hood shocks bonnet gas pressure strut lift support hood falls",
      "tools": [
        "Matched pair of hood supports",
        "Secure independent hood support and helper",
        "Small flat trim tool",
        "Eye protection"
      ],
      "cautions": [
        "A weak gas strut can release unexpectedly. Support the hood independently for the entire job and work on one side at a time.",
        "Gas struts are pressurized. Keep them away from heat and do not open the cylinder."
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "410-4, Fig. 10",
        "pdfPages": [
          336
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Secure the hood fully open",
          "body": "Park on level ground, open the hood and place an independent support that cannot slide off. Keep a helper in position and note the strut orientation and stud condition.",
          "check": "The hood’s weight is held independently and the new struts match."
        },
        {
          "title": "Release one strut at both studs",
          "body": "Raise the retaining clip just enough to unlock the end and slide the socket off its stud. Repeat at the opposite end while supporting the strut. Inspect studs and retainers for damage.",
          "check": "The first strut is free and both mounting studs are sound."
        },
        {
          "title": "Seat and test the replacement ends",
          "body": "Match the original orientation and seat both ends fully. Restore each clip and tug lightly to confirm retention. Repeat on the other side.",
          "check": "All four ends are positively retained."
        },
        {
          "title": "Verify support through the hood travel",
          "body": "With the helper still holding the hood, remove the independent support. Move the hood slowly and check that it stays up and closes without binding. Reinstall the support if it does not.",
          "check": "The hood holds open and closes and latches normally."
        }
      ]
    }
  },
  {
    "guide": "windshield-washer-pump",
    "revision": "6299fa2b7198ff6996b07426",
    "content": {
      "slug": "windshield-washer-pump",
      "title": "Replace the windshield washer pump",
      "system": "electrical",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Beginner",
      "kind": "replacement",
      "duration": "30–60 min",
      "summary": "Confirm the failed pump, remove it from the front reservoir, renew the grommet as needed and check spray and leakage.",
      "applicability": "Factory front windshield washer reservoir at the right front of the engine bay. The separate Touring rear and optional headlamp washer pumps use different access or parts.",
      "searchTerms": "washer pump windshield washer not spraying reservoir grommet leak nozzle windscreen",
      "tools": [
        "Correct pump and sealing grommet",
        "Catch container",
        "Trim and hose tools",
        "Washer fluid",
        "Meter for circuit checks"
      ],
      "cautions": [
        "Work with the key off during disassembly and keep hands clear of the wipers when testing. The pump may pull out of the grommet and spill the tank."
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "611-7–611-9, Fig. 22",
        "pdfPages": [
          393,
          394,
          395
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Isolate a pump fault",
          "body": "Verify fluid level, a free hose and nozzles and the correct fuse. Test the pump command with the applicable wiring diagram. A running pump with no spray calls for a hose, nozzle, pickup or leak check.",
          "check": "The front pump is identified and supply and ground are confirmed, or the wiring fault is being handled separately."
        },
        {
          "title": "Disconnect and drain the front reservoir",
          "body": "With ignition off, release the reservoir fasteners as needed for access. Disconnect the pump and level-switch plugs and label the delivery hose. Empty the reservoir into a catch container before releasing the pump.",
          "check": "The tank is supported and the openings can be accessed without tension on the harness."
        },
        {
          "title": "Renew the pump seal and reconnect",
          "body": "Pull the pump from its grommet and inspect the tank opening. Fit a good matching grommet and seat the replacement pump squarely. Reconnect the delivery hose, plugs and reservoir fasteners.",
          "check": "The pump sits flush and the hose and connectors are secure."
        },
        {
          "title": "Verify both spray and sealing",
          "body": "Add fluid and inspect the grommet for leaks. Operate the washer briefly from the driver’s seat. Check the spray and recheck the tank, hose and pump seal.",
          "check": "Both nozzles deliver fluid and the reservoir stays dry on the outside."
        }
      ]
    }
  },
  {
    "guide": "brake-pad-and-rotor-inspection",
    "revision": "a29387f52d32233c1aeb07a1",
    "content": {
      "slug": "brake-pad-and-rotor-inspection",
      "title": "Measure brake pad and rotor wear",
      "system": "brakes",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Intermediate",
      "kind": "inspection",
      "duration": "45–90 min",
      "summary": "Check inner and outer pads and compare rotor measurements with the stamped or verified limit for the installed brakes.",
      "applicability": "Bentley-covered U.S. cars with conventional disc brakes. Identify any nonfactory caliper, pad and rotor before comparing wear figures.",
      "searchTerms": "measure brake pads rotor disc thickness worn inner pad pulsation brakes minimum inspection",
      "tools": [
        "Proper lifting equipment and stands",
        "Light",
        "Pad gauge",
        "Brake disc micrometer",
        "Wheel torque wrench"
      ],
      "cautions": [
        "If the pedal sinks, fluid is leaking or braking is impaired, arrange recovery. Keep brake dust out of the air and support the vehicle before removing wheels.",
        "Use the installed rotor’s specification. The dash wear indicator samples only selected pads."
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "020-16; 340-3–340-7, Table b",
        "pdfPages": [
          38,
          319,
          320,
          321,
          322,
          323
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Record symptoms and identify the brakes",
          "body": "Note wheel position, pull, vibration, noise and warnings. Identify rotor dimensions and the actual caliper and pad setup. Obtain the correct wear limit for those parts.",
          "check": "The measurements can be compared with the matching specification."
        },
        {
          "title": "Measure lining separately from the backing plate",
          "body": "With the car safely supported, inspect inner and outer pad linings on both sides of the axle. Look for taper, contamination and uneven wear. If visibility is poor, use the applicable caliper access procedure.",
          "check": "Every inspected pad has a measured lining thickness or a note that it was inaccessible."
        },
        {
          "title": "Measure the disc at multiple points",
          "body": "Read the marked rotor minimum or confirm the matching part specification. Measure the swept disc away from the outer lip at several points and record the smallest value. Record cracking, scoring or heavy corrosion separately.",
          "check": "Disc thickness and surface condition are recorded for each side."
        },
        {
          "title": "Act on the weakest measurement",
          "body": "Compare the actual minima with the proper limits. Uneven pad wear needs a sliding or piston check before parts are replaced. Refit the wheels using the applicable wheel-bolt torque. Keep the car off the road if the brakes are unsafe.",
          "check": "There is a clear repair decision for both sides of the axle."
        }
      ]
    }
  },
  {
    "guide": "identify-transmission-tag",
    "revision": "e3cb5dab87bd95cac366a976",
    "content": {
      "slug": "identify-transmission-tag",
      "title": "Identify an E34 gearbox from its tag",
      "system": "drivetrain",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Beginner",
      "kind": "reference",
      "duration": "20–45 min",
      "summary": "Read the case tag and match the full gearbox code to factory application, fluid and repair information.",
      "applicability": "U.S. Bentley-covered E34s and the factory gearbox families in group 200. A stamped or tagged donor unit can differ from the chassis’s original transmission.",
      "searchTerms": "gearbox transmission identification tag code getrag zf 4hp22 a4s a5s s5d 250 310 560",
      "tools": [
        "Camera and light",
        "Factory application table",
        "Proper lift if access requires it"
      ],
      "cautions": [
        "Inspect only from safe access. Use rated lifting equipment and support whenever going under the car."
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "200-1–200-2; 230-1; 240-1",
        "pdfPages": [
          223,
          224,
          231,
          237
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Record the vehicle and current transmission",
          "body": "Note build date, model, installed engine, body and whether the gearbox or differential has been replaced. Record the shifter pattern and service history as clues.",
          "check": "Original vehicle details and current equipment are recorded separately."
        },
        {
          "title": "Read and photograph the tag",
          "body": "Group 200 locates manual markings near the top of the bellhousing and the automatic plate on the left behind the manual valve lever. Check the actual casting and tag layout. Record the entire code, serial or suffix and any separate fluid label. Clean gently so the markings remain legible.",
          "check": "The complete gearbox identifier is readable or marked as unresolved."
        },
        {
          "title": "Select the matching procedure",
          "body": "Compare the identifier with the applicable gearbox table and the unit’s supplier information. Use the specific manual or automatic service section. For a swap, record flange, shifter carrier and gearbox mount details before ordering parts.",
          "check": "The procedure and fluid are tied to the observed transmission rather than the model badge."
        }
      ]
    }
  },
  {
    "guide": "manual-transmission-fluid",
    "revision": "8019b5b24c3f6d4e62005aba",
    "content": {
      "slug": "manual-transmission-fluid",
      "title": "Drain and refill a factory manual gearbox",
      "system": "drivetrain",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Intermediate",
      "kind": "replacement",
      "duration": "45–90 min",
      "summary": "Identify the manual gearbox and fluid label, open the fill plug first, then fill and set the level with the car level.",
      "applicability": "Factory manual boxes in group 230. Fluid designation and torque depend on the observed gearbox and plug. The fluid capacities page lists the source quantities by code.",
      "searchTerms": "manual transmission fluid gear oil change drain refill atf getrag zf gearbox",
      "tools": [
        "Verified fluid and plug seals",
        "Appropriate plug tools and torque wrench",
        "Pump or fill hose",
        "Drain pan",
        "Level supported lift"
      ],
      "cautions": [
        "Confirm the fluid label and current specification before draining. Keep the vehicle level and securely supported. Warm lubricant can burn."
      ],
      "relatedGuides": [
        "identify-transmission-tag"
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "230-1–230-2, Fig. 1",
        "pdfPages": [
          231,
          232
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Match the fluid and plug hardware",
          "body": "Read the gearbox and fluid tags. Identify the side fill plug and lower drain plug from the correct source drawing. Obtain the applicable torque and seals before starting.",
          "check": "The observed transmission, fluid, fill plug and drain plug are all confirmed."
        },
        {
          "title": "Check fill access first",
          "body": "Clean around both plugs. Break the fill plug loose before opening the drain. If the fill plug will not release or its threads are damaged, resolve that before draining.",
          "check": "The gearbox can be refilled through the intended opening."
        },
        {
          "title": "Drain and inspect",
          "body": "Drain into a clean pan. Look for excess metal, water or unusual discoloration and record it. Clean the plugs and mating surfaces, then install the drain plug with the correct seal and torque.",
          "check": "The drain is sealed and any unusual debris is documented."
        },
        {
          "title": "Set the level and check the seals",
          "body": "With the car level, fill slowly through the fill opening until the lubricant reaches the specified opening level. Fit and torque the fill plug. Clean the case, check both plugs for leaks, and recheck after a short drive if the gearbox is otherwise serviceable.",
          "check": "The level, fluid type and applied torque are recorded and both plugs are dry."
        }
      ]
    }
  },
  {
    "guide": "differential-fluid-service",
    "revision": "106ab4b878c53b6e1037020d",
    "content": {
      "slug": "differential-fluid-service",
      "title": "Service the rear differential oil",
      "system": "drivetrain",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Intermediate",
      "kind": "replacement",
      "duration": "45–90 min",
      "summary": "Confirm an open or limited-slip unit, renew its lubricant and set the level at the correct fill port.",
      "applicability": "Factory-type E34 final-drive units with separate drain and fill plugs. Identify the installed tag and type, particularly on cars with differential swaps.",
      "searchTerms": "differential diff gear oil drain fill lsd limited slip final drive service",
      "tools": [
        "Approved lubricant for the actual unit",
        "Appropriate plug tool and seals",
        "Fluid pump and pan",
        "Level supported lift"
      ],
      "cautions": [
        "Keep the vehicle level and safely supported. Identify the plug and seal specification from the installed housing. The maintenance and final-drive tables disagree for the 530i and 535i."
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "020-8 and 331-4, Fig. 6",
        "pdfPages": [
          30,
          316
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Identify the installed differential",
          "body": "Read the tag at the left rear of the housing. Confirm the ratio and open or limited-slip design. A missing tag or aftermarket differential needs identification before lubricant is selected.",
          "check": "The fluid selection is tied to the actual differential."
        },
        {
          "title": "Confirm fill access and drain the oil",
          "body": "Clean both plugs. Loosen the upper fill plug first. Drain through the lower plug into a pan and inspect the drained oil for unusual material. Renew seals as specified.",
          "check": "The fill is accessible and the drain is refitted securely."
        },
        {
          "title": "Fill on a level plane",
          "body": "Pump in the verified fluid until it just reaches and begins to spill from the fill opening as described in 331-4. Let the flow settle and torque the fill plug using the applicable specification.",
          "check": "The level was established at the opening with the car level."
        },
        {
          "title": "Inspect the housing and record the service",
          "body": "Clean around the plugs and check for leakage at them and the output seals. Record the tag, fluid, date and any abnormal debris.",
          "check": "The housing is dry and a future owner can identify the lubricant used."
        }
      ]
    }
  },
  {
    "guide": "diagnose-blown-fuse",
    "revision": "9a040fad7c8921f0ebe0f2f4",
    "content": {
      "slug": "diagnose-blown-fuse",
      "title": "Find and test a blown fuse",
      "system": "electrical",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Beginner",
      "kind": "inspection",
      "duration": "15–45 min",
      "summary": "Identify the correct panel, test both sides of the fuse and decide whether the circuit needs further diagnosis.",
      "applicability": "Bentley-covered U.S. E34 with the corresponding original panel. Use the installed cover and correct wiring diagram for the exact circuit.",
      "searchTerms": "blown fuse test no power fuse keeps blowing short circuit fusebox multimeter",
      "tools": [
        "Wiring diagram and panel cover",
        "Multimeter",
        "Fuse puller",
        "Matching replacement fuse"
      ],
      "cautions": [
        "Do not bridge a fuse or increase its rating. If a replacement opens again, stop and find the short or excess load. Avoid probing airbag or unidentified terminals."
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "600-4–600-6; 610-1–610-5",
        "pdfPages": [
          378,
          379,
          380,
          381,
          382,
          383,
          384,
          385
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Identify the failed functions",
          "body": "List which devices are out and when the fault occurs. Look up the protected circuit and panel in the fuse reference, then verify the installed cover and wiring.",
          "check": "The correct panel, position, supply state and rating are known."
        },
        {
          "title": "Check both sides of the fuse",
          "body": "With the correct circuit state and a proven ground, measure at both exposed test points when available. Voltage on only one side points to an open fuse. No voltage on either side can mean the circuit has not been powered or the feed is missing.",
          "check": "The reading distinguishes a failed fuse from an upstream supply problem."
        },
        {
          "title": "Confirm continuity with the fuse removed",
          "body": "Turn the ignition and load off. Use the fuse puller and test the removed fuse for continuity if needed. Check its terminals and socket for heat damage or corrosion.",
          "check": "The fuse and holder condition are known."
        },
        {
          "title": "Replace once and verify the circuit",
          "body": "If the fuse is open, fit only the confirmed rating and retest the affected function. If it opens again, leave the circuit off and diagnose the protected branches with the diagram.",
          "check": "The function is restored with the correct fuse, or the recurring fault has been isolated for repair."
        }
      ]
    }
  },
  {
    "guide": "e34-blower-speed-diagnosis",
    "revision": "5fe83252a85b98ac4d1800aa",
    "content": {
      "slug": "e34-blower-speed-diagnosis",
      "title": "Diagnose a blower that only works on high",
      "system": "electrical",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Intermediate",
      "kind": "inspection",
      "duration": "30–90 min",
      "summary": "Identify the heater control system and separate a resistor or final-stage fault from a switch, connector or motor fault.",
      "applicability": "Bentley-covered U.S. E34 HVAC layouts. IHKR II/III use a series resistor on the documented configuration. IHKR I and IHKA use a final-stage unit.",
      "searchTerms": "heater fan blower motor only works high speed resistor sword final stage climate control no heat",
      "tools": [
        "Matching HVAC wiring diagram",
        "Multimeter",
        "Trim tools",
        "Light"
      ],
      "cautions": [
        "Isolate the battery as applicable before removing trim or a module. Check SRS precautions around the glovebox. Avoid shorting module connectors while measuring."
      ],
      "relatedGuides": [
        "diagnose-blown-fuse"
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "640-1–640-3, Table a and Figs. 4–5; 610",
        "pdfPages": [
          381,
          413,
          414,
          415
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Test and record each speed",
          "body": "With the car stationary, test each control position and confirm whether high runs smoothly. A dead motor at every speed, intermittent squeal or a burning smell needs a different branch of diagnosis.",
          "check": "The failing positions and motor behavior are recorded."
        },
        {
          "title": "Identify the installed control system",
          "body": "Check the HVAC layout against Table a, the controls and the connector. Locate the series resistor on the documented left-console access path or the final stage on the glovebox side for the matching variant.",
          "check": "The car’s actual resistor or module and wiring diagram match."
        },
        {
          "title": "Check the path before ordering a module",
          "body": "Verify supply and grounds and inspect the connector for heat or corrosion. Use the exact diagram to compare speed commands and motor output. With the circuit isolated, follow the appropriate resistor or final-stage check.",
          "check": "The fault is localized to a command, connection, module or motor branch."
        },
        {
          "title": "Restore the circuit and retest all speeds",
          "body": "Secure the connector and mount the module in its housing before running it. Test all control positions, listen for motor drag and recheck for heat damage. A dragging motor can damage a replacement controller.",
          "check": "Every speed works or the remaining fault is documented for the next test."
        }
      ]
    }
  },
  {
    "guide": "m50tu-vanos-piston-seals",
    "revision": "b02041e7ff12ed1b4f65d274",
    "content": {
      "slug": "m50tu-vanos-piston-seals",
      "title": "Renew the M50TU VANOS piston seals on the bench",
      "system": "engine",
      "engines": [
        "M50TU"
      ],
      "level": "Advanced",
      "kind": "replacement",
      "duration": "1–2 hours on the bench",
      "summary": "Inspect the actuator bore, fit a matching two-piece piston seal and size it before reinstalling and testing the unit.",
      "applicability": "M50TU single-VANOS actuator already removed using the correct timing fixtures. Confirm the installed part number and seal kit. Bentley covers unit removal and refitting. Beisan documents this internal seal repair.",
      "searchTerms": "vanos rebuild repair seals piston o ring teflon ptfe bench m50tu single actuator",
      "tools": [
        "Matched single-VANOS seal kit",
        "Clean bench and oil catch tray",
        "Seal removal tools",
        "Fresh engine oil",
        "Low-range torque wrench",
        "Seal supplier procedure"
      ],
      "cautions": [
        "Stop for a scored bore, damaged piston groove or splines, or binding after sizing. Protect precision surfaces during seal removal.",
        "Use the factory timing procedure to reinstall the unit and verify timing before cranking."
      ],
      "evidence": [
        {
          "label": "Beisan Systems single VANOS seal installation and sizing",
          "href": "https://beisansystems.com/single-vanos-6-cyl-e36-e34-e39/"
        }
      ],
      "relatedGuides": [
        "m50tu-single-vanos-service",
        "m50tu-vanos-diagnosis"
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "117-18–117-20, actuator removal and installation",
        "pdfPages": [
          138,
          139,
          140
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Drain and open the actuator",
          "body": "Drain residual engine oil into a pan and place the actuator on a clean, padded bench. Remove the cylinder cover fasteners and withdraw the cover with the shaft and piston supported. Inspect the cylinder and piston for marks, play and wear.",
          "check": "The bore and piston are suitable for resealing."
        },
        {
          "title": "Remove both parts of the old seal",
          "body": "Lift or carefully section the old outer ring and remove the underlying elastomer ring. Keep the blade off the groove and piston. Wipe the groove and inspect it in good light.",
          "check": "Both old rings are removed and the groove is clean and undamaged."
        },
        {
          "title": "Fit the energizer and outer ring",
          "body": "Seat the elastomer ring flat and untwisted. Condition the outer ring only as directed by the kit maker, then stretch it evenly just enough to seat above the inner ring. Lubricate the piston, bore and chamfer with clean oil as specified.",
          "check": "Both rings lie correctly in the groove without a twist, cut or folded edge."
        },
        {
          "title": "Size the outer ring and confirm smooth movement",
          "body": "Use the seal maker’s sizing sequence. For the cited Beisan kit, ease the piston into the lubricated cylinder at an angle and square it gradually. Back out and reposition if the ring catches. Let it size in the bore for the supplier’s dwell time before removal and inspection.",
          "check": "The ring is uniformly seated and the piston slides smoothly without shaving material."
        },
        {
          "title": "Close, reinstall and measure travel",
          "body": "Refit the cover using the kit and unit’s specified hardware, gasket and torque. Reinstall with the factory locking and indexing procedure, prove timing by hand and check the oil feed. Repeat the actuator travel test if operation is uncertain.",
          "check": "Mechanical timing, sealing and actuator operation have been checked."
        }
      ]
    }
  },
  {
    "guide": "factory-sliding-caliper-brake-pads",
    "revision": "bda2a26028b48f60bf5acc8f",
    "content": {
      "slug": "factory-sliding-caliper-brake-pads",
      "title": "Replace brake pads on factory sliding calipers",
      "system": "brakes",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Advanced",
      "kind": "replacement",
      "duration": "1–3 hours per axle",
      "summary": "Replace pads as an axle set on the illustrated two-guide-bolt calipers, inspect the piston and rotor, and verify a firm pedal before moving.",
      "applicability": "Bentley 340-4–5 factory floating-caliper design with two capped guide bolts, external anti-rattle clip and an inner pad retained by the piston. Confirm installed front or rear hardware. Use the separate procedure for other calipers and for the rear parking brake.",
      "searchTerms": "replace brake pads front rear brake pads caliper guide bolts wear sensor pad change",
      "tools": [
        "Matching axle pad set and sensor as applicable",
        "Rated lift and supports",
        "Caliper hanger",
        "Piston press",
        "Torque wrench",
        "Rotor micrometer"
      ],
      "cautions": [
        "A low reservoir, hydraulic leak, binding piston, damaged guide bolt or soft pedal requires diagnosis. The car must be firmly supported before removing wheels.",
        "Keep friction surfaces clean. If a bleed screw or line is opened, use the applicable brake bleeding procedure, including any ASC+T requirements, before moving the car."
      ],
      "relatedGuides": [
        "brake-pad-and-rotor-inspection",
        "brake-fluid-level-inspection"
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "010-3–010-4; 340-4–340-5, Figs. 2–6",
        "pdfPages": [
          11,
          12,
          320,
          321
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Verify the caliper, rotor and parts",
          "body": "Match both calipers to the illustrated hardware and confirm pads, sensor, retainers and guide bolts. Measure rotors against their marked or verified minimum before deciding to reuse them.",
          "check": "The caliper type is confirmed and both rotors meet the reuse criteria."
        },
        {
          "title": "Lift, unplug the sensor and release the caliper",
          "body": "Secure the car and remove the axle’s wheels. Remove the guide-bolt caps and bolts. Where fitted, unplug and unclip the wear sensor. Remove the external anti-rattle clip and pull the caliper straight off. Suspend it from the chassis without stressing the hose.",
          "check": "The hose is unstressed, the caliper is secure and no brake pedal operation is possible while it is off."
        },
        {
          "title": "Inspect and retract the piston",
          "body": "Remove the pads and inspect the caliper, hose, piston boot and guide bolts. Retract the piston slowly using the appropriate tool and the hydraulic procedure for the installed ABS system. Monitor reservoir level and keep dirt out. Stop if the piston binds or leaks.",
          "check": "The piston retracts smoothly and the hydraulic circuit is sealed or has a verified bleeding plan."
        },
        {
          "title": "Fit the pads and route the sensor",
          "body": "Fit the outer pad and seat the inner pad’s spring in the piston. Renew the sensor if it triggered or was damaged. Route its lead through the original holders. Use approved brake paste only on indicated contact points. The source’s guide bolts are installed clean and dry.",
          "check": "Pads and clips seat correctly, sensor wiring clears moving parts and friction faces are uncontaminated."
        },
        {
          "title": "Secure the caliper and prove the pedal",
          "body": "For the exact source-shown guide bolts Bentley specifies 35 Nm. Fit the caps and anti-rattle clip, then reassemble both sides and torque wheels to the verified specification. With the car stationary, stroke the pedal to seat the pads and confirm a firm pedal and correct fluid level. Check leaks before a controlled low-speed test and follow the pad maker’s bedding instructions.",
          "check": "Pedal pressure holds, braking is even and no leaks, rubbing or warning remain."
        }
      ]
    }
  },
  {
    "guide": "factory-manual-clutch-installation",
    "revision": "5e8a2bc7786ceb192618bfec",
    "content": {
      "slug": "factory-manual-clutch-installation",
      "title": "Replace the clutch with the manual gearbox removed",
      "system": "drivetrain",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "level": "Advanced",
      "kind": "replacement",
      "duration": "2–4 hours after gearbox removal",
      "summary": "Inspect the flywheel and release hardware, center the new disc and install the matched clutch before refitting the transmission.",
      "applicability": "Factory-type E34 manual clutch covered by group 210, after the gearbox has been removed using its specific group 230 procedure. Confirm whether the installed pressure plate has separate manufacturer-specific installation requirements.",
      "searchTerms": "clutch replacement pressure plate flywheel clutch disc install pilot bearing throwout release bearing manual swap",
      "tools": [
        "Matched clutch kit and new fasteners",
        "Flywheel holding fixture",
        "Clutch pilot alignment tool",
        "Torque wrench",
        "Correct lubricant for specified contact points",
        "Transmission jack"
      ],
      "cautions": [
        "Support the engine and gearbox properly. Do not use transmission bolts to pull a misaligned gearbox against the engine.",
        "Keep lubricant off the friction surfaces and use the new pressure-plate bolts required by the source."
      ],
      "relatedGuides": [
        "identify-transmission-tag",
        "manual-transmission-fluid"
      ],
      "durationBasis": "Editorial estimate for an accessible, source-matching installation.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "210-4–210-6; 230-5–230-6",
        "pdfPages": [
          228,
          229,
          230,
          235,
          236
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Match the clutch stack and lock the flywheel",
          "body": "Record the gearbox code and compare flywheel, disc spline, pressure plate and release hardware. With the gearbox safely removed, secure the flywheel and release the pressure-plate bolts gradually in a uniform pattern while supporting the plate and disc.",
          "check": "The clutch comes off without uncontrolled spring movement and the matching parts are identified."
        },
        {
          "title": "Inspect the flywheel, pilot and release parts",
          "body": "Check the flywheel for scoring, cracking and damaged locating pins. Check the pilot bearing, disc splines, fork, pivot and release bearing. Investigate oil contamination before installing new friction parts. Use new flywheel bolts if the flywheel comes off.",
          "check": "The flywheel and release system are serviceable or their replacement is specified."
        },
        {
          "title": "Center the disc and torque the pressure plate",
          "body": "Clean the mating surfaces and face the disc as marked. Seat the plate on its locating pins and center the disc with a pilot tool. Tighten the new bolts evenly in stages. For the source’s listed fasteners, grade 8.8 is 24 Nm and grade 10.9 is 34 Nm. Verify the installed fasteners and kit instructions.",
          "check": "Disc alignment and bolt grade are confirmed and final tightening is recorded."
        },
        {
          "title": "Refit release hardware and gearbox",
          "body": "Check the bearing guide material before applying lubricant. The source leaves the plastic guide sleeve dry and specifies different treatment for earlier aluminum. Check fork and bearing engagement and renew the six-speed pivot and spring clip where applicable. Remove the locking fixture and refit the supported gearbox.",
          "check": "The bellhousing seats without bolt force and the release hardware is secure."
        },
        {
          "title": "Verify disengagement before road testing",
          "body": "Restore the slave cylinder and hydraulic circuit using group 210, bleed if needed and inspect for leaks. Verify clutch pedal return and disengagement with the vehicle secured. Confirm gear engagement, reverse lamp operation and that there are no abnormal sounds before a controlled test.",
          "check": "The clutch engages and disengages normally with a stable fluid level."
        }
      ]
    }
  },
  {
    "guide": "e34-525i-five-speed-swap",
    "revision": "b8e09c892c7ffd76b982946e",
    "content": {
      "kind": "planning",
      "level": "Advanced",
      "duration": "Several hours of planning",
      "track": "swap",
      "slug": "e34-525i-five-speed-swap",
      "title": "Plan an E34 525i five-speed manual swap",
      "system": "drivetrain",
      "engines": [
        "M50",
        "M50TU"
      ],
      "summary": "Select a matched manual driveline for an automatic M50/M50TU 525i, then work through pedals, hydraulics, wiring and commissioning.",
      "applicability": "U.S. left-hand-drive M50/M50TU 525i. Plan from a comparable factory manual donor. Sedan and Touring shaft and linkage fitment must be verified separately. M20, M30, V8 and RHD donor combinations require their own plan.",
      "searchTerms": "auto automatic to manual transmission swap conversion five speed 5 speed 525i getrag 250 zf 310 320 manual pedal donor touring",
      "tools": [
        "Recipient and donor production dates and gearbox codes",
        "Catalog and matching wiring diagrams",
        "Transmission jack and proper lift",
        "Clutch alignment tool",
        "Driveshaft measurements"
      ],
      "cautions": [
        "Retain working starter interlock and reverse lamps as applicable. Resolve the circuit using vehicle-specific diagrams and verified wiring, without an unfused starter jumper.",
        "Use the exact source for automatic removal, including converter handling, and support the engine and gearbox independently."
      ],
      "relatedGuides": [
        "identify-transmission-tag",
        "factory-manual-clutch-installation",
        "manual-transmission-fluid"
      ],
      "durationBasis": "Estimate for the checks listed here. Build time depends on the car and donor.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "200-2, Table b; 210-2–210-5; 230-5; 240-5–240-11; 250-2; 260-4–260-7",
        "pdfPages": [
          224,
          226,
          228,
          229,
          235,
          241,
          244,
          245,
          256,
          264,
          267
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Choose a complete, documented donor set",
          "body": "The period 525i manual table lists ZF S5D 310 Z through the July 1992 transition and Getrag S5D 250 G from that transition. Identify the donor by its tag rather than using the month alone. Record body, gearbox code, output flange, drive flange at the differential and installed shaft length.",
          "check": "A complete recipient/donor matrix exists with every flange and mount verified."
        },
        {
          "title": "Lay out the mechanical parts before taking the car apart",
          "body": "Group gearbox, crossmember and mounts, shifter carrier and selector rod, matched driveshaft and flex disc, flywheel, pilot bearing, clutch and release hardware. Match fasteners by unit and identify single-use hardware. Use a shaft with the correct center bearing position and keep its halves indexed.",
          "check": "Every part is present or separately specified and a shop has resolved any custom shaft work."
        },
        {
          "title": "Plan pedals and clutch hydraulic routing",
          "body": "Confirm the donor’s left-hand-drive brake and clutch pedal arrangement, master-cylinder mounting, reservoir feed, hard line, flexible section and slave. Lay out factory-style routing, clips and heat clearance. Use group 210 for bleeding and verify whether fluid work affects the brake reservoir.",
          "check": "The hydraulic system can be installed and bled without a kink, chafe point or unresolved fitting."
        },
        {
          "title": "Plan removal and fit the manual driveline",
          "body": "Follow the installed automatic’s removal section. With the vehicle and powertrain supported, remove the automatic and its cooler connections as required. Follow the matching clutch and manual-box procedures for the pilot bearing, flywheel, clutch, gearbox and mounts. Fit the shifter and indexed shaft using the driveline procedure.",
          "check": "The gearbox, shifter and shaft fit without interference, and every required torque and fluid spec is recorded."
        },
        {
          "title": "Resolve start, reverse and control-unit behavior",
          "body": "Compare recipient automatic and equivalent manual wiring sheets. Trace the start-enable circuit and manual reverse switch, cruise cancellation if equipped, the automatic controller and any coding or cluster behavior. Prove the final circuit states before applying power.",
          "check": "Starter authorization and reverse lamps work as intended. There are no loose live circuits or unresolved controller faults."
        },
        {
          "title": "Commission from static checks to a short drive",
          "body": "Bleed the clutch and inspect for leaks. Fill the gearbox by tag. With the car secured, verify pedal return, disengagement, gear selection, reverse lights and wiring. Check driveshaft clearance, support and mounting. Only after those pass, perform a controlled low-speed test and inspect for vibration or fluid loss.",
          "check": "The build passes the mechanical and electrical checks and has a dated record of installed parts."
        }
      ]
    }
  },
  {
    "guide": "e34-540i-six-speed-conversion",
    "revision": "72afcd41a0f8fc8f95d0d82d",
    "content": {
      "kind": "planning",
      "level": "Advanced",
      "duration": "Several hours of planning",
      "track": "swap",
      "slug": "e34-540i-six-speed-conversion",
      "title": "Plan an E34 540i six-speed conversion",
      "system": "drivetrain",
      "engines": [
        "M60"
      ],
      "summary": "Build a donor checklist around the E34 540i S6S 560G and verify clutch, shaft, differential and chassis-side interfaces.",
      "applicability": "U.S. E34 540i M60 with factory A5S 560Z automatic as the starting point. Factory 540i six-speed equipment is the reference. Check all part numbers and dimensions for cross-chassis V8 gearbox donors.",
      "searchTerms": "540i six speed manual swap 6 speed 560g getrag 420g 560z automatic conversion m60 v8",
      "tools": [
        "Factory 540i manual and automatic parts lists",
        "Donor gearbox and shaft identifiers",
        "Donor and recipient EWD",
        "Shop lift and transmission jack"
      ],
      "cautions": [
        "Use the complete V8 clutch and release geometry verified for the chosen gearbox. Shared BMW transmission names do not establish bellhousing or driveline compatibility.",
        "Resolve starter authorization, clutch switches and brake/clutch hydraulic operation before road use."
      ],
      "relatedGuides": [
        "identify-transmission-tag",
        "factory-manual-clutch-installation",
        "manual-transmission-fluid",
        "e34-525i-five-speed-swap"
      ],
      "durationBasis": "Estimate for the checks listed here. Build time depends on the car and donor.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "200-1–200-2, Tables a–b; 210; 230-5; 240-9–240-11; 260-4",
        "pdfPages": [
          223,
          224,
          225,
          229,
          235,
          245,
          246,
          247,
          264
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Inventory the V8 transmission set",
          "body": "Identify the installed automatic and the intended six-speed by tag. Compare starter position, input pilot, spline and release travel. Record the donor flywheel, clutch, pressure plate, release bearing, fork, pivot and slave as a complete interface.",
          "check": "The donor is identified and the clutch stack and release travel have a documented match."
        },
        {
          "title": "Match shaft, crossmember and rear gearing",
          "body": "Use the factory manual recipient as a comparison for support location, shifter carrier and gearbox output flange. Measure the shaft installation length, center bearing position and differential flange. Calculate overall gearing with the actual differential and tire circumference.",
          "check": "No shaft or flange dimension is assumed from the donor model name."
        },
        {
          "title": "Lay out hydraulics and controls",
          "body": "Confirm pedal and master mounting, reservoir takeoff, pipe and slave connection. Trace the manual start-enable and reverse-lamp circuits and determine coding requirements from the actual production-date diagrams.",
          "check": "The planned hydraulic and electrical arrangements retain all applicable interlocks."
        },
        {
          "title": "Sequence installation and verification",
          "body": "Pair the A5S removal section with the manual and clutch installation sections. Check fit before final tightening. Verify clutch disengagement and all six gears, reverse lamps, fluid levels and shaft clearance before road testing. Stop for leakage, driveline vibration or fault indications.",
          "check": "The shop has a written installation, verification and rollback plan for this specific car."
        }
      ]
    }
  },
  {
    "guide": "e34-525i-s52-engine-swap",
    "revision": "42ed42e844486491c52e179f",
    "content": {
      "kind": "planning",
      "level": "Advanced",
      "duration": "Several hours of planning",
      "track": "swap",
      "slug": "e34-525i-s52-engine-swap",
      "title": "Plan an S52 swap into an M50 E34 525i",
      "system": "engine",
      "engines": [
        "M50",
        "M50TU"
      ],
      "summary": "Build the recipient-to-donor fitment sheet for sump clearance, cooling, wiring, emissions and first start before buying or removing an engine.",
      "applicability": "Rear-wheel-drive E34 525i with an M50 or M50TU as the recipient and a U.S. S52 donor as the proposed engine. Match actual donor electronics and chassis configuration. This is a documented build plan, with donor-specific wiring and fabrication decisions still required.",
      "searchTerms": "engine swap s52 s50 m52 m50 525i e36 donor oil pan sump pickup dme obd2 wiring swap motor",
      "tools": [
        "Donor vehicle and engine identity",
        "Both wiring diagrams and parts catalogs",
        "Engine hoist and rated supports",
        "Measurement tools",
        "Appropriate scan and oil-pressure test equipment"
      ],
      "cautions": [
        "Check road-use engine-change and emissions requirements for your jurisdiction before purchasing parts. Keep required emissions and diagnostic systems operational.",
        "Confirm sump-to-crossmember, steering and oil pickup clearance. Verify oil supply before combustion."
      ],
      "evidence": [
        {
          "label": "ASC Fabrics E34 S52 and manual swap build log",
          "href": "https://www.ascfabrics.com/post/e34s52-5"
        },
        {
          "label": "California BAR engine replacement and engine change rules",
          "href": "https://www.bar.ca.gov/engine-changes/"
        },
        {
          "label": "U.S. EPA motor vehicle tampering and aftermarket devices",
          "href": "https://www.epa.gov/enforcement/air-enforcement"
        }
      ],
      "relatedGuides": [
        "identify-your-engine",
        "e34-525i-five-speed-swap"
      ],
      "durationBasis": "Estimate for the checks listed here. Build time depends on the car and donor.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "100-1–100-4; 110-4–110-8; 119-5; 130-20; 170; 200-2",
        "pdfPages": [
          43,
          44,
          62,
          63,
          64,
          65,
          66,
          149,
          188,
          205,
          224
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Record both cars and the inspection path",
          "body": "Document the E34’s date, body, steering side and original emissions equipment. Record the S52 donor date, complete engine and harness, DME and immobilizer arrangement, oxygen sensors and catalysts. Verify the local inspection path before committing to a donor.",
          "check": "The complete donor identity, required equipment and inspection requirements are recorded."
        },
        {
          "title": "Prove the oil system and mounting geometry",
          "body": "Compare the E34 front-sump arrangement against the donor pan, pickup, dipstick and oil-pump interfaces. Check pickup depth, clearances and sealing as a system. Confirm mounting arms, engine position, crossmember and steering clearance through expected movement before final fit.",
          "check": "A dimensioned mock-up confirms pan, pickup, mounts and steering clearance."
        },
        {
          "title": "Close the transmission, exhaust and cooling interfaces",
          "body": "Decide which gearbox stays. Verify pilot, flywheel, clutch, starter, driveshaft and differential. Mock up exhaust routing and sensor positions without losing required components. Check heater and radiator hose connections, fan clearance, temperature switch/control and service access.",
          "check": "Every mechanical interface has a donor part reference or documented fabrication drawing."
        },
        {
          "title": "Build and verify a wiring schedule",
          "body": "Compare pin function and connector views in both wiring diagrams. Trace power, grounds, charging, starter request, fuel pump, tachometer, coolant indication, diagnostic connector and immobilizer authorization. Have the schedule checked before applying power.",
          "check": "The agreed wiring retains the required diagnostic and security functions and has no unverified feed or ground."
        },
        {
          "title": "Write the first-start and fault-response plan",
          "body": "Confirm safe oil priming for the donor, pressure monitoring, cooling fill and bleed, fuel leak checks and scan access. Confirm throttle return and accessory routing. Stop on absent pressure, overheating, leaks or unexplained faults, and check cooling and wiring again after warmup.",
          "check": "The car has a signed-off pre-start checklist and documented inspection steps before road use."
        }
      ]
    }
  },
  {
    "guide": "e34-m60b30-to-b40-swap",
    "revision": "dbbfa7d4e2732d6296b7db29",
    "content": {
      "kind": "planning",
      "level": "Advanced",
      "duration": "Several hours of planning",
      "track": "swap",
      "slug": "e34-m60b30-to-b40-swap",
      "title": "Plan an M60B30 to M60B40 engine swap",
      "system": "engine",
      "engines": [
        "M60"
      ],
      "summary": "Compare an E34 530i recipient to the factory E34 540i package and account for the larger engine’s drivetrain, cooling and management requirements.",
      "applicability": "Factory V8 E34 530i recipient and identified M60B40 donor. E34 540i hardware is the comparison set. This guide addresses a V8-to-V8 project. Six-cylinder chassis conversions are a separate engineering job.",
      "searchTerms": "530i 540i v8 engine swap m60b30 m60b40 3.0 4.0 engine transplant",
      "tools": [
        "530i and 540i equipment records",
        "Donor engine identification and condition report",
        "Factory diagrams",
        "Hoist and lift plan"
      ],
      "cautions": [
        "Use the donor’s engine-management and emissions requirements and verify local rules. Engine fit does not establish clutch, automatic converter, cooling or driveline capacity."
      ],
      "evidence": [
        {
          "label": "California BAR engine replacement and engine change rules",
          "href": "https://www.bar.ca.gov/engine-changes/"
        },
        {
          "label": "U.S. EPA motor vehicle tampering and aftermarket devices",
          "href": "https://www.epa.gov/enforcement/air-enforcement"
        }
      ],
      "relatedGuides": [
        "e34-540i-six-speed-conversion",
        "identify-transmission-tag"
      ],
      "durationBasis": "Estimate for the checks listed here. Build time depends on the car and donor.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "100-1, Table a; 110-12–110-14; 170-9; 200-1–200-2",
        "pdfPages": [
          43,
          70,
          71,
          72,
          213,
          223,
          224
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Identify the actual V8 donor",
          "body": "Confirm B40 identity and production date, then assess condition before installation. Compare the E34-specific sump, pickup, mounts and accessory bracket package with the donor.",
          "check": "The engine is positively identified and has a condition record and E34 mounting plan."
        },
        {
          "title": "Compare complete 530i and 540i packages",
          "body": "Check engine management, exhaust and emissions, intake and fuel hardware, cooling and fans, gearbox, differential ratio, driveshaft and axle interfaces. Verify brakes and suspension against the intended factory equipment and inspection requirements.",
          "check": "The list names each component that is retained, transferred or requires a verified replacement."
        },
        {
          "title": "Resolve electronics and gearbox before installation",
          "body": "Confirm the actual DME, harness, sensors and immobilizer compatibility. Match the gearbox code, flywheel or flexplate and starter to the engine. Confirm controller and cooler compatibility for automatic installations.",
          "check": "All controls and mechanical interfaces have compatible parts and documented wiring."
        },
        {
          "title": "Set acceptance checks",
          "body": "Use the M60 removal and installation section for shop sequencing. Confirm fuel and coolant tightness, oil pressure, charging, fan operation and diagnostic communication before moving the car. Record inspection and cooling checks through a heat cycle.",
          "check": "The installation plan includes clear stop conditions and inspection requirements."
        }
      ]
    }
  },
  {
    "guide": "m50tu-vanos-delete-planning",
    "revision": "f97d29721a386e2aec660a81",
    "content": {
      "kind": "planning",
      "level": "Advanced",
      "duration": "Several hours of planning",
      "track": "mod",
      "slug": "m50tu-vanos-delete-planning",
      "title": "Evaluate a fixed-timing M50TU VANOS delete",
      "system": "engine",
      "engines": [
        "M50TU"
      ],
      "summary": "Compare restoring single VANOS with a kit-specific fixed-timing build, including cam targets, clearance measurements and engine management.",
      "applicability": "M50TU with a documented single-VANOS elimination kit and a qualified engine builder. The VAC instructions are an example for their specific kit. Check its exact hardware and the cam maker’s specification.",
      "searchTerms": "vanos delete elimination kit fixed cam timing disable vanos m50tu race cam conversion adjustable sprocket",
      "tools": [
        "Kit-specific manufacturer instructions",
        "Cam timing card",
        "Degree wheel and dial indicator",
        "Factory crank and cam alignment tools",
        "Clearance measuring equipment"
      ],
      "cautions": [
        "Disconnecting the solenoid does not install fixed mechanical timing. Incorrect cam timing or insufficient piston clearance can destroy the engine.",
        "Review emissions and road-use rules before changing timing or calibration. Preserve required diagnostics and controls."
      ],
      "evidence": [
        {
          "label": "VAC Motorsports single VANOS elimination kit instructions",
          "href": "https://store.vacmotorsports.com/articles/INST-VEK-M50.htm"
        },
        {
          "label": "U.S. EPA motor vehicle tampering and aftermarket devices",
          "href": "https://www.epa.gov/enforcement/air-enforcement"
        }
      ],
      "relatedGuides": [
        "m50tu-vanos-diagnosis",
        "m50tu-single-vanos-service"
      ],
      "durationBasis": "Estimate for the checks listed here. Build time depends on the car and donor.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "117-16–117-20, factory single VANOS baseline",
        "pdfPages": [
          136,
          137,
          138,
          139,
          140
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Define the reason for changing the system",
          "body": "Use the factory test to establish whether there is a command, travel or mechanical indexing fault. For a camshaft build, record the actual cam and required fixed timing. Compare with restoring the factory system for the same use.",
          "check": "The decision has a measured baseline and a stated performance or reliability goal."
        },
        {
          "title": "Confirm the kit and cam stack",
          "body": "Identify the intake cam, trigger and sprocket. Cross-check the kit hardware and shim stack against the exact installation sheet. Confirm the oil and trigger arrangement the manufacturer expects. Obtain written cam targets and fastener specifications.",
          "check": "Every part and timing target is documented for this engine and cam."
        },
        {
          "title": "Degree the cams and measure clearance",
          "body": "Use the manufacturer’s sequence and verify installed cam position with a degree wheel and indicator. Measure piston-to-valve clearance through the relevant crank angles with the actual head, gasket and cams. Confirm timing again through hand rotation before any starter use.",
          "check": "Measured values meet the cam and build specifications and nothing binds."
        },
        {
          "title": "Verify control behavior and record the result",
          "body": "Confirm the applicable engine calibration, diagnostic behavior and compliance path. Plan oil-pressure, idle and hot restart checks and retain the parts and notes needed to restore the original system.",
          "check": "The build has measured timing, clearance, calibration and inspection records."
        }
      ]
    }
  },
  {
    "guide": "e34-self-leveling-suspension-conversion",
    "revision": "4c7ace13d1fc82816b83f81d",
    "content": {
      "kind": "planning",
      "level": "Advanced",
      "duration": "Several hours of planning",
      "track": "mod",
      "slug": "e34-self-leveling-suspension-conversion",
      "title": "Plan a self-leveling suspension delete or repair",
      "system": "suspension",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "summary": "Identify the LAD hydraulic circuit, compare an original-system repair with a spring and damper conversion, and verify retained power steering.",
      "applicability": "E34 with confirmed factory LAD/SLS hardware. Match body, axle load and hydraulic pump layout. Touring and Sedan spring and damper choices must be verified for the specific car.",
      "searchTerms": "sls delete self leveling self levelling lad hydraulic rear suspension shocks accumulators wagon touring conversion coilover",
      "tools": [
        "Hydraulic schematic and equipment tags",
        "Rated lift",
        "Correct spring/damper application data",
        "Ride-height and alignment records"
      ],
      "cautions": [
        "The hydraulic system can retain pressure with the engine stopped. Use the applicable depressurization procedure. Do not cut, plug or reroute lines without understanding pump flow and steering supply.",
        "Use equipment rated for spring loads and an appropriately qualified installer."
      ],
      "relatedGuides": [
        "power-steering-fluid-level-inspection"
      ],
      "durationBasis": "Estimate for the checks listed here. Build time depends on the car and donor.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "300-5; 330-3–330-4 and 330-10–330-13",
        "pdfPages": [
          275,
          301,
          302,
          308,
          309,
          310,
          311
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Identify the source of the height or ride fault",
          "body": "Record rear ride height at both sides and under known load. Identify regulator link, accumulators, struts and signs of leaks. Compare the existing equipment with the LAD schematic before choosing repair or conversion.",
          "check": "The hydraulic fault and the actual equipment are identified."
        },
        {
          "title": "Map the hydraulic supply and return",
          "body": "Trace the reservoir, pump and circuits supplying the steering and the rear. Record approved fluid and the factory routing. Define what hardware is required to keep steering supplied and how retired lines will be managed safely.",
          "check": "The proposed arrangement has a verified pressure and return path for every retained system."
        },
        {
          "title": "Choose springs, dampers and stops as a set",
          "body": "Select hardware rated for the body and rear axle load. Verify mounts, spring pads, bump stops, wheel travel and loaded ride height. Document the compatible conversion instructions before releasing pressure or lifting the car.",
          "check": "The complete rear assembly is specified for the actual vehicle and intended loads."
        },
        {
          "title": "Measure the completed installation",
          "body": "After the matched procedures are followed, check steering assist, leaks, ride height, travel, tire clearance and alignment with the vehicle safely supported and then under normal load. Record the parts and make the change visible in the service history.",
          "check": "Hydraulics, axle geometry and loaded clearance all pass the inspection."
        }
      ]
    }
  },
  {
    "guide": "e34-electric-fan-conversion",
    "revision": "84bc4b94ee4e18740895588c",
    "content": {
      "kind": "planning",
      "level": "Advanced",
      "duration": "Several hours of planning",
      "track": "mod",
      "slug": "e34-electric-fan-conversion",
      "title": "Plan a mechanical fan delete with electric cooling",
      "system": "engine",
      "engines": [
        "M20",
        "M30",
        "M50",
        "M50TU",
        "M60"
      ],
      "summary": "Treat the electric fan, shroud, relay circuit and failure behavior as a cooling system, with measurable hot-idle checks before road use.",
      "applicability": "E34 with a verified original mechanical fan arrangement and an engineered electric replacement. Match engine, radiator, A/C and existing auxiliary fan wiring. No generic switch temperature or fuse rating applies to all conversions.",
      "searchTerms": "fan delete fan clutch delete mechanical fan electric fan conversion efan spal relay shroud radiator overheating idle",
      "tools": [
        "Fan manufacturer specifications",
        "Vehicle wiring diagram",
        "Current measurement tools",
        "Actual coolant-temperature reading",
        "Clearance measurements"
      ],
      "cautions": [
        "An auxiliary A/C fan’s presence alone does not demonstrate enough cooling capacity. Verify capacity and clearance before removing the mechanical fan.",
        "Protect wiring near the power source and keep hands clear of fans that can start automatically."
      ],
      "relatedGuides": [
        "cooling-system-visual-check",
        "cooling-fan-airflow-check",
        "diagnose-blown-fuse"
      ],
      "durationBasis": "Estimate for the checks listed here. Build time depends on the car and donor.",
      "source": {
        "id": "bentley-e34-upload",
        "title": "BMW 5 Series (E34) Service Manual",
        "section": "170-1–170-4, 170-12; 600-4; 610-1–610-5",
        "pdfPages": [
          205,
          206,
          207,
          208,
          216,
          378,
          381,
          382,
          383,
          384,
          385
        ]
      },
      "reviewStatus": "draft",
      "sourceChecked": true,
      "steps": [
        {
          "title": "Establish the cooling baseline",
          "body": "Confirm radiator, thermostat, cap, coolant circulation and both factory fan functions first. Record coolant behavior at idle and with A/C demand. Repair cooling faults before changing the fan arrangement.",
          "check": "The baseline separates a fan limitation from an existing cooling fault."
        },
        {
          "title": "Verify the fan and shroud package",
          "body": "Measure radiator core and available depth. Use documented fan airflow and current data for a puller or pusher layout. Check the shroud, core sealing, mounts and clearance to belts, hoses and engine movement.",
          "check": "Air is routed through the core and the assembly clears moving parts."
        },
        {
          "title": "Design protected power and control",
          "body": "Size the relay/controller, wiring, grounds and fuse to the fan manufacturer’s current and inrush data. Use an appropriate temperature signal, verify A/C integration and define the behavior if the switch, relay or fan fails.",
          "check": "The circuit is drawn, protected and rated, with defined failure behavior."
        },
        {
          "title": "Prove both operation and recovery",
          "body": "Verify direction, current and switch operation in a stationary test. Monitor actual coolant temperature as the system heats and cycles, including A/C demand as applicable. Stop if temperature climbs out of the verified range, the fan fails to start or wiring overheats. Recheck mounts and wiring after a controlled drive.",
          "check": "Temperature stabilizes in the intended conditions and the verification record includes current and cycle behavior."
        }
      ]
    }
  }
]
$e34_guides$::jsonb;
begin
  insert into public.guides(id, component_id, title, source_id, source_locator, engines, review_status, content)
  select guide, content->>'system', content->>'title', content#>>'{source,id}',
         content#>>'{source,section}', array(select jsonb_array_elements_text(content->'engines')),
         content->>'reviewStatus', content
  from jsonb_to_recordset(payload) as entry(guide text, revision text, content jsonb)
  on conflict do nothing;

  insert into public.guide_step_index(guide_id, revision, step_number, title)
  select guide, revision, ordinal::int, step->>'title'
  from jsonb_to_recordset(payload) as entry(guide text, revision text, content jsonb)
  cross join lateral jsonb_array_elements(content->'steps') with ordinality as item(step, ordinal)
  on conflict do nothing;

  insert into public.guide_revision_archive(guide_id, revision, content)
  select guide, revision, content
  from jsonb_to_recordset(payload) as entry(guide text, revision text, content jsonb)
  on conflict do nothing;
end;
$migration$;
