import { existsSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';
import { cwd } from 'process';

const file = path.join(cwd(), "monsters.ndjson");

if (existsSync(file)){
    await unlink(file);
}

const monstersRequest = await fetch("https://www.dnd5eapi.co/api/monsters");
const monsters = (await monstersRequest.json())?.results ?? [];

let i = 0;
for (const monster of monsters){
    i++;

    const request = await fetch(`https://www.dnd5eapi.co/${monster.url.replace(/^(\/)/, "")}`);
    const response = await request.json();

    console.log(`Processing (${i}/${monsters.length}): ${response.name}`);

    // quick sleep, it's rude to slam someones free public API...
    await new Promise((resolve) => {
        setTimeout(resolve, 100);
    });

    const immunities = [];
    response["damage_immunities"].map(value => {
        immunities.push(value);
    });
    response["condition_immunities"].map(value => {
        immunities.push(value);
    });

    const legendaryActions = response?.["legendary_actions"] ?? [];

    const data = {
        index: response.index,
        name: response.name,
        size: response.size,
        type: response.type,
        subtype: response.subtype,
        alignment: response.alignment,
        ac: response["armor_class"],
        hp: response["hit_points"],
        hitDice: response["hit_dice"],
        str: response.strength,
        dex: response.dexterity,
        con: response.constitution,
        int: response.intelligence,
        wis: response.wisdom,
        cha: response.charisma,
        languages: response.languages,
        cr: response["challenge_rating"],
        xp: response.xp,
        speed: formatSpeed(response["speed"]),
        vulnerabilities: formatMixed(response["damage_vulnerabilities"]),
        resistances: formatMixed(response["damage_resistances"]),
        immunities: formatMixed(immunities),
        senses: formatObject(response.senses),
        savingThrows: formatSavingThrows(response["proficiencies"]),
        skills: formatSkills(response["proficiencies"]),
        abilities: formatTableData(response["special_abilities"]),
        actions: formatTableData(response.actions),
        legendaryActions: formatTableData(legendaryActions),
    };

    await writeFile(file, JSON.stringify(data) + "\n", { flag: "a" });
}

function formatMixed(data){
    let value = "";
    for (let i = 0; i < data.length; i++){
        if (typeof data[i] === "object"){
            value += `${data[i].name}, `;
        } else {
            value += `${data[i]}, `;
        }
    }
    value = value.trim().replace(/\,$/, "").replace(/\_/g, " ");
    if (!value?.length){
        value = null;
    }
    return value;
}

function formatObject(data){
    let value = "";
    for (const key in data){
        value += `${key} ${data[key]}, `;
    }
    value = value.trim().replace(/\,$/, "").replace(/\_/g, " ");
    if (!value?.length){
        value = null;
    }
    return value;
}

function formatSavingThrows(data){
    let value = "";
    const regex = new RegExp("Saving Throw:");
    for (let i = 0; i < data.length; i++){
        if (regex.test(data[i].proficiency.name)){
            value += `${data[i].proficiency.name.replace("Saving Throw:", "").trim()} ${data[i].value >= 0 ? "+" : "-"}${data[i].value}, `;
        }
    }
    value = value.trim().replace(/\,$/, "").replace(/\_/g, " ");
    if (!value?.length){
        value = null;
    }
    return value;
}

function formatSkills(data){
    let value = "";
    const regex = new RegExp("Skill:");
    for (let i = 0; i < data.length; i++){
        if (regex.test(data[i].proficiency.name)){
            value += `${data[i].proficiency.name.replace("Skill:", "").trim()} ${data[i].value >= 0 ? "+" : "-"}${data[i].value}, `;
        }
    }
    value = value.trim().replace(/\,$/, "").replace(/\_/g, " ");
    if (!value?.length){
        value = null;
    }
    return value;
}

function formatUsage(usage){
    let output = "";
    if (usage?.times){
        output = `${usage?.times} ${usage?.type}`;
    } else if (usage?.dice){
        output = `${usage?.type} ${usage?.dice} ${usage?.["min_value"] ? `min ${usage?.["min_value"]}` : null}`;
    }
    output = output.trim();
    return `(${output})`;
}

function formatTableData(data){
    const output = [];
    if (Array.isArray(data)){
        for (let i = 0; i < data.length; i++){
            let usage = "";
            if (data[i]?.usage){
                usage = formatUsage(data[i].usage);
            }
            output.push({
                name: `${data[i].name} ${usage}`.trim(),
                desc: data[i].desc,
            });
        }
    }
    return output;
}

function formatSpeed(speedObject){
    let speed = "";
    for (const key in speedObject){
        if (key !== "hover"){
            speed += `${speedObject[key]} ${key}, `;
        }
    }
    speed = speed.trim().replace(/\,$/, "").replace(/\_/g, " ");
    if (!speed?.length){
        speed = null;
    }
    return speed;
}