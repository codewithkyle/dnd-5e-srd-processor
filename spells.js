import { existsSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';
import { cwd } from 'process';

const file = path.join(cwd(), "spells.ndjson");

if (existsSync(file)){
    await unlink(file);
}

const baseRequest = await fetch("https://www.dnd5eapi.co/api/spells");
const spells = (await baseRequest.json())?.results ?? [];

let i = 0;
for (const spell of spells){
    i++;

    const request = await fetch(`https://www.dnd5eapi.co/${spell.url.replace(/^(\/)/, "")}`);
    const response = await request.json();

    console.log(`Processing (${i}/${spells.length}): ${response.name}`);

    // quick sleep, it's rude to slam someones free public API...
    await new Promise((resolve) => {
        setTimeout(resolve, 100);
    });

    const data = {
        index: response.index,
        name: response.name,
        desc: formatDescription(response),
        range: response.range,
        components: response.components,
        material: response.material,
        ritual: response.ritual,
        duration: response.duration,
        castingTime: response.casting_time,
        level: response.level,
        attackType: response.attack_type,
        damageType: response?.damage?.damage_type?.name ?? null,
        damage: response?.damage?.damage_at_slot_level ?? null,
        school: response?.school?.name ?? null,
        classes: formatArray(response, "classes"),
        subclasses: formatArray(response, "subclasses"),
    };

    await writeFile(file, JSON.stringify(data) + "\n", { flag: "a" });
}

function formatArray(response, key){
    let output = [];
    if (response[key]?.length){
        for (let i = 0; i < response[key].length; i++){
            output.push(response[key][i].name);
        }
    }
    return output;
}

function formatDescription(response){
    const IsHeading = new RegExp(/^(\#)/);
    const IsTableRow = new RegExp(/(\|)$/);

    let output = "";
    if (response.desc?.length){
        for (const desc of response.desc){
            if (IsHeading.test(desc)){
                output += `\n${desc}\n`;
            }
            else if (IsTableRow.test(desc)){
                output += `${desc}\n`;
            }
            else {
                output += `\n${desc}\n`;
            }
        }
    }
    if (response.higher_level?.length){
        for (const desc of response.higher_level){
            output += desc;
            output += "\n";
        }
    }
    output = output.trim();
    return output;
}