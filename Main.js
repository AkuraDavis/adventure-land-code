// Hey there!
// This is CODE, lets you control your character with code.
// If you don't know how to code, don't worry, It's easy.
// Just set attack_mode to true and ENGAGE!

let attack_mode = true;
let assist_mode = false;
let assist_target = "Feriath";
let autoparty = true;
let mob_target = "armadillo";
// let mob_target = "rat";

load_code(1);

setInterval(function(){

	smart_potions();
	restock();
	loot();
	xp_tracker();

	auto_attack();
	auto_party();
	assist();

},1000/4); // Loops every 1/4 seconds.