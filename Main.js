// Hey there!
// This is CODE, lets you control your character with code.
// If you don't know how to code, don't worry, It's easy.
// Just set attack_mode to true and ENGAGE!

let attack_mode = true;
let assist_mode = false;
let assist_target = "Feriath";
let autoparty = true;
let mob_target;
// let desired_target = "armadillo";
let desired_target = "porcupine";

load_code(1);

setInterval(function(){
    if(character.rip){ set_message("Respawning..."); setTimeout(function(){respawn();}, 15000); }

    smart_potions();
    restock();
    loot();
    xp_tracker();

    auto_attack();
    auto_party();
    assist();

},1000/4); // Loops every 1/4 seconds.