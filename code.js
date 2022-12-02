let editor = document.querySelector("#editor");
let run = document.querySelector("#run-button");
let decode = document.querySelector("#decode-button");
let animate = document.querySelector("#animation-button");
let lineNo = 0;
let digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];

// A array of pairs where first item is regname and second item is regcode
let regs16 = [["ax", "000"], ["bx", "011"], ["cx", "001"], ["dx", "010"],
["sp", "100"], ["bp", "101"], ["si", "110"], ["di", "111"]];


// An array of pairs where first item is label name and second item is line no.
let labels = [];


let regs8 = [["ah", "000"], ["al", "000"], ["bh", "011"], ["bl", "011"],
["ch", "001"], ["cl", "001"], ["dh", "010"], ["dl", "010"]];

let a = ace.edit(editor, {
	theme: "ace/theme/cobalt",
	mode: "ace/mode/assembly_x86",
});


let c = document.getElementById("myCanvas");
let ctx = c.getContext("2d");
ctx.lineWidth = "3";
ctx.strokeStyle = "#061731";
draw8086();


function draw8086(){
	drawBox("BIU", "", 50, 50);
	drawBox("Decoder", "", 250, 50);
	drawBox("ALU", "", 250, 250);
	drawBox("Memory", "", 50, 250);
	drawBox("Control Unit","", 150, 150);

	drawLine(150, 80, 250, 80);
	drawLine(300, 120, 300, 180);
	drawLine(300, 180, 250, 180);
	drawLine(300, 190, 250, 190);
	drawLine(300, 250, 300, 190);
	drawLine(100, 190, 150, 190);
	drawLine(100, 250, 100, 190);
	drawLine(150, 280, 250, 280);
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function drawBox(name, inst, x, y, clr = '#061731'){
	ctx.fillStyle = clr;
	ctx.fillRect(x, y, 100, 70);
	ctx.font = "10px Comic Sans MS";
	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.fillText(name, x+50, y+20);
	console.log(inst);
	console.log(inst.length);
	if(inst.length > 16){
		ctx.fillText(inst.substring(0, 16), x+50, y+40);
		ctx.fillText(inst.substring(16), x+50, y+60);
	}
	else{
		ctx.fillText(inst, x+50, y+40);
	}
		
	ctx.stroke();
}

function drawLine(x1, y1, x2, y2){
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
}

function changeColor(name, inst, x, y){
	drawBox(name, inst, x, y, '#198618')
}

async function fetchdecode(inst, machcode){
	await sleep(1000);
	changeColor("BIU", inst, 50, 50);
	await sleep(2000);
	drawBox("BIU", "", 50, 50);
	changeColor("Decoder", machcode, 250, 50);
	await sleep(2000);
	drawBox("Decoder", "", 250, 50);
	
}

async function alu(inst, machcode, process){
	await fetchdecode(inst, machcode)
	changeColor("ALU", process, 250, 250);
	await sleep(2000);
	drawBox("ALU", "", 250, 250);	
}

async function animatemem(inst, machcode, mem){
	await fetchdecode(inst, machcode);
	changeColor("Memory", mem, 50, 250);
	await sleep(2000);
	drawBox("Memory", "", 50, 250);	
}

async function memalumem(inst, machcode, mem1, process, mem2){
	await fetchdecode(inst, machcode);
	changeColor("Memory", mem1, 50, 250);
	await sleep(2000);
	drawBox("Memory", "", 50, 250);	
	changeColor("ALU", process, 250, 250);
	await sleep(2000);
	drawBox("ALU", "", 250, 250);
	changeColor("Memory", mem2, 50, 250);
	await sleep(2000);
	drawBox("Memory", "", 50, 250);	
}

// Generic R/M class
class Register {
	constructor(reg_name) {
		this.reg_name = reg_name;
	}

	setReg(value) {
		let bin = value.toString(2); // convert binary string

		bin = bin.padStart(16, "0"); // append with zeros

		for (let i = 0; i < 16; i++) {
			const tagID = this.reg_name + "_" + i;
			document.getElementById(tagID).innerHTML = bin[bin.length - i - 1];
		}
	}

	setLowerByte(value) {
		let bin = value.toString(2); // convert binary string

		bin = bin.padStart(8, "0"); // append with zeros

		for (let i = 0; i < 8; i++) {
			const tagID = this.reg_name[0] + "X" + "_" + i;
			document.getElementById(tagID).innerHTML = bin[bin.length - i - 1];
		}
	}

	setHigherByte(value) {
		let bin = value.toString(2); // convert binary string

		bin = bin.padStart(8, "0"); // append with zeros

		for (let i = 8; i < 16; i++) {
			const tagID = this.reg_name[0] + "X" + "_" + i;
			document.getElementById(tagID).innerHTML = bin[15 - i];
		}
	}

	getReg() {
		let value = "";
		for (let i = 0; i < 16; i++) {
			const tagID = this.reg_name + "_" + i;
			value += document.getElementById(tagID).innerText;
		}
		return reverseString(value);
	}

	getLowerByte() {
		let value = "";
		for (let i = 0; i < 16; i++) {
			const tagID = this.reg_name[0] + "X" + "_" + i;
			value += document.getElementById(tagID).innerText;
		}
		value = reverseString(value);
		return value.substring(8)
	}

	getHigherByte() {
		let value = "";
		for (let i = 0; i < 16; i++) {
			const tagID = this.reg_name[0] + "X" + "_" + i;
			value += document.getElementById(tagID).innerText;
		}
		value = reverseString(value);
		return value.substring(0, 8)
	}

}


// Compile Button Click
run.addEventListener('click', () => {
	lineNo = 0;

	const allcode = a.getValue();
	code = allcode.split("\n");
	for (let i = 0; i < code.length; i++) // Getting all labels
	{
		const words = code[i].split(" ");
		const fword = words[0].toLowerCase();
		if (fword[0, 2] != "//" && fword[fword.length - 1] == ":") // is not comment and is label
		{
			labels.push([fword.substr(0, fword.length - 1).toLowerCase(), i]);
		}
	}
	console.log(code);
	console.log(labels);

})

// Decode Button Click
decode.addEventListener('click', () => {
	if (lineNo < code.length) {

		AsmToMch(code[lineNo]);
		console.log(code[lineNo]);
		document.getElementById("CurrInst").innerText = code[lineNo];
		lineNo++;

	}
})


// Utility Functions
function isregister(val) {
	for (let i = 0; i < regs16.length; i++) {
		if (val === regs16[i][0] || val === regs8[i][0]) {
			return true;
		}
	}

	return false;
}

function is8byteregister(val) {
	for (let i = 0; i < regs16.length; i++) {
		if (val === regs8[i][0]) {
			return true;
		}
	}

	return false;
}

function getRegCode(name) {
	for (let i = 0; i < regs16.length; i++) {
		if (name === regs16[i][0]) {
			return regs16[i][1];
		}
	}
	for (let i = 0; i < regs8.length; i++) {
		if (name === regs8[i][0]) {
			return regs8[i][1];
		}
	}
	console.log("ERROR: getRegCode called on non-reg name");
	return "";
}

function ismemory(val) //checking input if its from memory;
{
	if (val.charAt(0) == "[" && val.charAt(val.length - 1 == "]")) {
		return true;
	}

	if (val.charAt(0) == "[" && val.charAt(val.length - 1 !== "]")) {
		console.log("Error!");
		return false;
	}
	return false;
}

function getLabelLine(name) {
	for (let i = 0; i < labels.length; i++) {
		if (name === labels[i][0]) {
			return labels[i][1];
		}
	}
	return -1;
}

function isnumber(val) {
	let count = 0;
	let start = 0;
	if(val[0] === '-'){
		start = 1;
		count++;
	}
		

	for (let i = start; i < val.length; i++) {
		for (let j = 0; j < digits.length; j++) {
			if (val[i] === digits[j]) {
				count++;
			}
		}
	}

	if (val[val.length-1] === 'b' || val[val.length-1] === 'h') {
		count++;
	}



	if (count >= val.length) {
		return true;
	}
	return false;
}

function setnumber(secondop){
	if(secondop.charAt(secondop.length-1) === 'b'){
		secondop = parseInt(secondop.substring(0, secondop.length-1), 2).toString();
	}
	else if(secondop.charAt(secondop.length-1) === 'h'){
		secondop = parseInt(secondop.substring(0, secondop.length-1), 16).toString();
	}
	return secondop;
}

function reverseString(str) {
	if (str === "") // This is the terminal case that will end the recursion
		return "";

	else
		return reverseString(str.substr(1)) + str.charAt(0);
}

function getLittleEndian(binstr) {
	if (binstr.length == 16) {
		return binstr.substr(8) + binstr.substr(0, 8);
	}
	console.log("ERROR: getLittleEndian called on non-word");
	return binstr;
}

function isbinary(str, i = 0) {
	if (i == str.length) {
		return true;
	}
	if (str[i] == 0 || str[i] == 1) {
		let ret = isbinary(str, ++i);
		return ret;
	}
	return false;
}

function ishex(str) {
	var regex = /[0-9A-Fa-f]{6}/g;
	if (str.match(regex)) {
		return true;
	} else {
		return false;
	}

}

// Updates Machine code
function updateMachineCode(binstr) {
	for (let i = 8; i < binstr.length; i += 8) // Loop through and add " " after every byte
	{
		binstr = binstr.substr(0, i) + " " + binstr.substr(i);
		i++;
	}
	for (let i = 17; i < binstr.length; i += 17) // Loop through and remove " " after every word then add "\n"
	{
		binstr = binstr.substr(0, i) + "\n" + binstr.substr(i + 1);
		i++;
	}
	document.getElementById("MachCode").innerText = binstr;
}

// Main Conversion Function

function AsmToMch(code) {
	console.log(code);

	const words = code.split(" ");
	const instruction = words[0].toLowerCase();
	if (instruction.substring(0, 2) === "//") {
		console.log("OHH YEAAAA! comment");
		fetchdecode(code, "");
		return;
	}

	if (instruction === "mov") {
		const firstop = words[1].substring(0, words[1].length - 1).toLowerCase();
		let secondop = words[2].toLowerCase();
		let machCode = "";
		console.log("OHH YEAAAA! mov");

		// Register to Register 
		if (isregister(firstop) && isregister(secondop)) {
			console.log("OHH YEAAAA! direct");
			let reg1 = new Register(firstop.toUpperCase());
			let reg2 = new Register(secondop.toUpperCase());


			if (is8byteregister(firstop) && is8byteregister(secondop)) {

				if (reg1.reg_name[1].toLowerCase() === "l" && reg2.reg_name[1].toLowerCase() === "l") {
					reg1.setLowerByte(reg2.getLowerByte().padStart(8, "0"));
				}
				else if (reg1.reg_name[1].toLowerCase() === "h" && reg2.reg_name[1].toLowerCase() === "h") {
					reg1.setHigherByte(reg2.getHigherByte().padStart(8, "0"));
				}
				else if (reg1.reg_name[1].toLowerCase() === "l" && reg2.reg_name[1].toLowerCase() === "h") {
					reg1.setLowerByte(reg2.getHigherByte().padStart(8, "0"));
				}
				else if (reg1.reg_name[1].toLowerCase() === "h" && reg2.reg_name[1].toLowerCase() === "l") {
					reg1.setHigherByte(reg2.getLowerByte().padStart(8, "0"));
				}
				else {
					console.log("Error!")
				}

			}
			else {
				reg1.setReg(reg2.getReg().padStart(16, "0"));
			}


			machCode += "100010"; //opcode
			machCode += "1"; //dir
			if (is8byteregister(firstop) && is8byteregister(secondop)) {
				machCode += "0";
			}
			else {
				machCode += "1";
			}

			machCode += "11"; //mod
			machCode += getRegCode(firstop); //reg
			machCode += getRegCode(secondop); //r/m

			alu(code, machCode, secondop + " -> " + firstop);
		}

		// Immidate data to register
		if (isregister(firstop) && isnumber(secondop)) {
			console.log("OHH YEAAAA! immediate");
			let reg = new Register(firstop.toUpperCase());
			secondop = setnumber(secondop);
			
			
			if (is8byteregister(firstop)) {

				if (reg.reg_name[1].toLowerCase() === "l") {
					reg.setLowerByte(parseInt(secondop));
				}
				else if (reg.reg_name[1].toLowerCase() === "h") {
					reg.setHigherByte(parseInt(secondop));
				}
				else {
					console.log("Error!");
				}

			}
			else {
				reg.setReg(parseInt(secondop));
			}

			machCode += "1100011"; //opcode
			if (is8byteregister(firstop)) {
				machCode += "0";
			}
			else {
				machCode += "1";
			}
			machCode += "11"; //mod
			machCode += "000"; //fixed
			machCode += getRegCode(firstop); //r/m
			machCode += getLittleEndian(parseInt(secondop).toString(2).padStart(16, "0")); //data
			
			alu(code, machCode, secondop + " -> " + firstop);
		}

		// Immidate data to memory
		if (ismemory(firstop) && isnumber(secondop)) {
			const memloc = firstop.substring(1, firstop.length - 1); //remove []
			secondop = setnumber(secondop);
			// Direct memory
			if (isnumber(memloc)) {
				console.log("OHH YEAAAA! MEM DIRECT");
				let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;

				let mem = new Register(hexmem.toUpperCase());
				mem.setReg(parseInt(secondop));

				machCode += "1100011"; //opcode
				machCode += "1"; //w-bit 
				machCode += "00"; //mod
				machCode += "000"; //fixed
				machCode += "110"; //r/m
				machCode += getLittleEndian(parseInt(memloc).toString(2).padStart(16, "0")); //address
				
				animatemem(code, machCode, secondop + " -> " + firstop);
			}

			// memory in register (NEED TO CHECK MACHINE CODE FOR THIS)
			if (isregister(memloc)) {
				console.log("OHH YEAAAA! MEM INDIRECT");
				let reg1 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				hexmem = "f" + hexmem;
				let mem = new Register(hexmem.toUpperCase());
				mem.setReg(parseInt(secondop));
				machCode += "1100011"; //opcode

				machCode += "1"; //w-bit (CHANGE THIS CODE WHEN BYTE MOV FUNCTIONALITY ADDED)
				machCode += "00"; //mod
				machCode += "000"; //fixed
				machCode += "111"; //r/m <- NOT SURE ABOUT THIS

				animatemem(code, machCode, secondop + " -> " + firstop);
			}

		}

		// Memory to register
		if (isregister(firstop) && ismemory(secondop)) {
			let reg1 = new Register(firstop.toUpperCase());
			const memloc = secondop.substring(1, secondop.length - 1);

			// Direct memory
			if (isnumber(memloc)) {
				console.log("OHH YEAAAA! REG DIRECT");
				let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;

				let mem = new Register(hexmem.toUpperCase());

				if (is8byteregister(firstop)) {

					if (reg1.reg_name[1].toLowerCase() === "l") {
						reg1.setLowerByte(mem.getLowerByte().padStart(16, "0"));
					}
					else if (reg1.reg_name[1].toLowerCase() === "h") {
						reg1.setHigherByte(mem.getLowerByte().padStart(16, "0"));
					}
					else {
						console.log("Error!")
					}

				}
				else {
					reg1.setReg(mem.getReg().padStart(16, "0"));
				}



				machCode += "100010"; //opcode
				if (is8byteregister(firstop)) {
					machCode += "0";
				}
				else {
					machCode += "1";
				}
				machCode += "00"; //mod

				machCode += getRegCode(firstop); //reg
				machCode += "110"; //r/m
				machCode += getLittleEndian(parseInt(memloc).toString(2).padStart(16, "0")); //address

				animatemem(code, machCode, secondop + " -> " + firstop);
			}

			// Memory location in register (NEED TO CHECK MACHINE CODE FOR THIS)
			if (isregister(memloc)) {
				console.log("OHH YEAAAA! REG INDIRECT");
				let reg2 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg2.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg2 data.
				hexmem = "f" + hexmem;

				let mem = new Register(hexmem.toUpperCase());

				if (is8byteregister(firstop)) {

					if (reg1.reg_name[1].toLowerCase() === "l") {
						reg1.setLowerByte(mem.getLowerByte().padStart(16, "0"));
					}
					else if (reg1.reg_name[1].toLowerCase() === "h") {
						reg1.setHigherByte(mem.getLowerByte().padStart(16, "0"));
					}
					else {
						console.log("Error!")
					}

				}
				else {
					reg1.setReg(mem.getReg().padStart(16, "0"));
				}

				machCode += "100010"; //opcode
				machCode += "1"; //dir
				if (is8byteregister(firstop)) {
					machCode += "0";
				}
				else {
					machCode += "1";
				}
				machCode += "00"; //mod
				machCode += getRegCode(firstop); //reg
				machCode += "111"; //r/m <- NOT SURE ABOUT THIS

				animatemem(code, machCode, secondop + " -> " + firstop);
			}
		}

		// register to memory 
		if (ismemory(firstop) && isregister(secondop)) {
			let reg2 = new Register(secondop.toUpperCase());
			const memloc = firstop.substring(1, firstop.length - 1); //remove []

			// Direct memory 
			if (isnumber(memloc)) {
				console.log("OHH YEAAAA! REG DIRECT");
				let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;
				console.log(hexmem);
				let mem = new Register(hexmem.toUpperCase());
				if (is8byteregister(secondop)) {

					if (reg2.reg_name[1].toLowerCase() === "l") {
						mem.setLowerByte(reg2.getLowerByte().padStart(16, "0"));
					}
					else if (reg2.reg_name[1].toLowerCase() === "h") {
						mem.setLowerByte(reg2.getHigherByte().padStart(16, "0"));
					}
					else {
						console.log("Error!")
					}

				}
				else {
					mem.setReg(reg2.getReg().padStart(16, "0"));
				}


				machCode += "100010"; //opcode

				machCode += "0"; //dir
				if (is8byteregister(firstop)) {
					machCode += "0";
				}
				else {
					machCode += "1";
				}
				machCode += "00"; //mod
				machCode += getRegCode(secondop); //reg
				machCode += "110"; //r/m
				machCode += getLittleEndian(parseInt(memloc).toString(2).padStart(16, "0")); //address

				animatemem(code, machCode, secondop + " -> " + firstop);
			}

			// memory in register (NEED TO CHECK MACHINE CODE FOR THIS)
			if (isregister(memloc)) {
				console.log("OHH YEAAAA! REG INDIRECT");
				let reg1 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				hexmem = "f" + hexmem;

				let mem = new Register(hexmem.toUpperCase());

				if (is8byteregister(secondop)) {

					if (reg2.reg_name[1].toLowerCase() === "l") {
						mem.setLowerByte(reg2.getLowerByte().padStart(16, "0"));
					}
					else if (reg2.reg_name[1].toLowerCase() === "h") {
						mem.setLowerByte(reg2.getHigherByte().padStart(16, "0"));
					}
					else {
						console.log("Error!")
					}

				}
				else {
					mem.setReg(reg2.getReg().padStart(16, "0"));
				}

				machCode += "100010"; //opcode
				machCode += "1"; //dir
				if (is8byteregister(firstop)) {
					machCode += "0";
				}
				else {
					machCode += "1";
				}
				machCode += "00"; //mod
				machCode += getRegCode(secondop); //reg
				machCode += "111"; //r/m <- NOT SURE ABOUT THIS

				animatemem(code, machCode, secondop + " -> " + firstop);
			}
		}

		console.log(machCode);
		updateMachineCode(machCode);

		return machCode;
	}

	if (instruction === "inc") {
		const operand = words[1].toLowerCase();

		let machCode = "";

		if (isregister(operand)) {
			let reg = new Register(operand.toUpperCase());
			
			if(is8byteregister(operand))
			{
				if(reg.reg_name[1] === "H")
				{
					let val = parseInt(reg.getHigherByte(), 2);
					val++;
					reg.setHigherByte(val);
				}
				else if(reg.reg_name[1] === "L")
				{
					let val = parseInt(reg.getLowerByte(), 2);
					val++;
					reg.setLowerByte(val);
				}
				else{
					console.log("error")
				}
			}
			else
			{
				let val = parseInt(reg.getReg(), 2);
				val++;
				reg.setReg(val);
			}
			


			machCode += "1111111"; //opcode
			if(is8byteregister){
				machCode += "0";
			}
			else
			{
				machCode += "1";
			}
			
			machCode += "11"; //mod
			machCode += "000"; //fixed
			machCode += getRegCode(operand); //r/mx

			alu(code, machCode, operand + " += 1 ");
		}
		if (ismemory(operand)) {
			const memloc = operand.substring(1, operand.length - 1); //remove []

			// Direct memory 
			if (isnumber(memloc)) {
				let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;
				console.log(hexmem);
				let mem = new Register(hexmem.toUpperCase());
				let val = parseInt(mem.getReg(), 2);
				val++;
				mem.setReg(val);


				machCode += "1111111"; //opcode

				machCode += "1"; //w-bit (CHANGE THIS CODE WHEN BYTE MOV FUNCTIONALITY ADDED)
				machCode += "00"; //mod
				machCode += "000"; //fixed
				machCode += "110"; //r/m

				machCode += getLittleEndian(parseInt(memloc).toString(2).padStart(16, "0")); //address

				memalumem(code, machCode,operand + " -> ALU", "value += 1", "ALU -> " + operand );

			}

			// memory in register (NEED TO CHECK MACHINE CODE FOR THIS)
			if (isregister(memloc)) {
				let reg1 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				hexmem = "f" + hexmem;
				let mem = new Register(hexmem.toUpperCase());
				let val = parseInt(mem.getReg(), 2);
				val++;
				mem.setReg(val);


				machCode += "1111111"; //opcode

				machCode += "1"; //w-bit (CHANGE THIS CODE WHEN BYTE MOV FUNCTIONALITY ADDED)
				machCode += "00"; //mod
				machCode += "000"; //fixed
				machCode += "111"; //r/m  <- NOT SURE ABOUT THIS

				memalumem(code, machCode,operand + " -> ALU", "value += 1", "ALU -> " + operand );

			}

		}
		console.log(machCode);
		updateMachineCode(machCode);
		return machCode;
	}

	if (instruction === "dec") {
		const operand = words[1].toLowerCase();
		let machCode = "";
		
		if (isregister(operand)) {
			let reg = new Register(operand.toUpperCase());
			
			if(is8byteregister(operand))
			{
				if(reg.reg_name[1] === "H")
				{
					let val = parseInt(reg.getHigherByte(), 2);
					val--;
					reg.setHigherByte(val);
				}
				else if(reg.reg_name[1] === "L")
				{
					let val = parseInt(reg.getLowerByte(), 2);
					val--;
					reg.setLowerByte(val);
				}
				else{
					console.log("error")
				}
			}
			else
			{
				let val = parseInt(reg.getReg(), 2);
				val--;
				reg.setReg(val);
			}
			machCode += "1111111"; //opcode
			if(is8byteregister){
				machCode += "0";
			}
			else
			{
				machCode += "1";
			}
			machCode += "11"; //mod
			machCode += "001"; //reg
			machCode += getRegCode(operand); //r/m
			alu(code, machCode, operand + " -= 1 ");
		}
		

		if (ismemory(operand)) {
			const memloc = operand.substring(1, operand.length - 1); //remove []

			// Direct memory 
			if (isnumber(memloc)) {
				let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;
				console.log(hexmem);
				let mem = new Register(hexmem.toUpperCase());
				let val = parseInt(mem.getReg(), 2);
				val--;
				mem.setReg(val);


				machCode += "1111111"; //opcode

				machCode += "1"; //w-bit (CHANGE THIS CODE WHEN BYTE MOV FUNCTIONALITY ADDED)
				machCode += "00"; //mod
				machCode += "001"; //fixed
				machCode += "110"; //r/m

				machCode += getLittleEndian(parseInt(memloc).toString(2).padStart(16, "0")); //address
				memalumem(code, machCode,operand + " -> ALU", "value -= 1", "ALU -> " + operand );

			}

			// memory in register (NEED TO CHECK MACHINE CODE FOR THIS)
			if (isregister(memloc)) {
				let reg1 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				hexmem = "f" + hexmem;
				let mem = new Register(hexmem.toUpperCase());
				let val = parseInt(mem.getReg(), 2);
				val--;
				mem.setReg(val);


				machCode += "1111111"; //opcode

				machCode += "1"; //w-bit (CHANGE THIS CODE WHEN BYTE MOV FUNCTIONALITY ADDED)
				machCode += "00"; //mod
				machCode += "001"; //fixed
				machCode += "111"; //r/m  <- NOT SURE ABOUT THIS
				memalumem(code, machCode,operand + " -> ALU", "value -= 1", "ALU -> " + operand );

			}

		}
		console.log(machCode);
		updateMachineCode(machCode);
		return machCode;
	}

	if (instruction === "neg") {
		const operand = words[1];
		let machCode = "";

		if (isregister(operand)) {
			let reg = new Register(operand.toUpperCase());
			
			if(is8byteregister(operand))
			{
				if(reg.reg_name[1] === "H")
				{
					let val = parseInt(reg.getHigherByte(), 2);
					val = 256 - val;
					reg.setHigherByte(val);
				}
				else if(reg.reg_name[1] === "L")
				{
					let val = parseInt(reg.getLowerByte(), 2);
					val = 256 - val;
					reg.setLowerByte(val);
				}
				else{
					console.log("error")
				}
			}
			else
			{
				let val = parseInt(reg.getReg(), 2);
				val = 35536 - val;
				reg.setReg(val);
			}
			

			machCode += "1111011"; //op-code
			if(is8byteregister){
				machCode += "0";
			}
			else
			{
				machCode += "1";
			}machCode += "11"; //mod
			machCode += "011"; //fixed
			machCode += getRegCode(operand); //r/m	
			alu(code, machCode, operand + " 2s compliment ");		
		}
		if (ismemory(operand)) {
			const memloc = operand.substring(1, operand.length - 1); //remove []

			// Direct memory 
			if (isnumber(memloc)) {
				let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;
				console.log(hexmem);
				let mem = new Register(hexmem.toUpperCase());
				let val = parseInt(mem.getReg(), 2);
				val = 65536 - val;
				let str = val.toString(2);
				mem.setReg(str);

				machCode += "1111011"; //op-code
				machCode += "1" //w-bit (CHANGE THIS CODE WHEN BYTE MOV FUNCTIONALITY ADDED)
				machCode += "00"; //mod
				machCode += "011"; //fixed
				machCode += "110"; //r/m
				machCode += getLittleEndian(parseInt(memloc).toString(2).padStart(16, "0")); //address

				memalumem(code, machCode,operand + " -> ALU", " 2s compliment ", "ALU -> " + operand );

			}


			// memory in register (NEED TO CHECK MACHINE CODE FOR THIS)
			if (isregister(memloc)) {

				let reg1 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				hexmem = "f" + hexmem;
				let mem = new Register(hexmem.toUpperCase());
				let val = parseInt(mem.getReg(), 2);
				val = 65536 - val;
				let str = val.toString(2);
				mem.setReg(str);


				machCode += "1111011"; //op-code
				machCode += "1" //w-bit (CHANGE THIS CODE WHEN BYTE MOV FUNCTIONALITY ADDED)
				machCode += "00"; //mod
				machCode += "011"; //fixed
				machCode += "111"; //r/m  <- NOT SURE ABOUT THIS
				memalumem(code, machCode,operand + " -> ALU", " 2s compliment ", "ALU -> " + operand );

			}
		}
		updateMachineCode(machCode);
		return machCode;
	}

	if (instruction === "not") {
		const operand = words[1];
		let machCode = "";

		if (isregister(operand)) {
			let reg = new Register(operand.toUpperCase());
			
			if(is8byteregister(operand))
			{
				if(reg.reg_name[1] === "H")
				{
					let val = parseInt(reg.getHigherByte(), 2);
					val = 255 - val;
					reg.setHigherByte(val);
				}
				else if(reg.reg_name[1] === "L")
				{
					let val = parseInt(reg.getLowerByte(), 2);
					val = 255 - val;
					reg.setLowerByte(val);
				}
				else{
					console.log("error")
				}
			}
			else
			{
				let val = parseInt(reg.getReg(), 2);
				val = 35535 - val;
				reg.setReg(val);
			}

			machCode += "1111011"; //op-code
			if(is8byteregister){
				machCode += "0";
			}
			else
			{
				machCode += "1";
			}
			machCode += "11"; //mod
			machCode += "010"; //fixed
			machCode += getRegCode(operand); //r/m
			alu(code, machCode, operand + " 2s compliment ");	
		}
		if (ismemory(operand)) {
			const memloc = operand.substring(1, operand.length - 1); //remove []

			// Direct memory 
			if (isnumber(memloc)) {
				let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;
				console.log(hexmem);
				let mem = new Register(hexmem.toUpperCase());
				let val = parseInt(mem.getReg(), 2);
				val = 65535 - val;
				let str = val.toString(2);
				mem.setReg(str);

				machCode += "1111011"; //op-code
				machCode += "1" //w-bit (CHANGE THIS CODE WHEN BYTE MOV FUNCTIONALITY ADDED)
				machCode += "00"; //mod
				machCode += "010"; //fixed
				machCode += "110"; //r/m
				machCode += getLittleEndian(parseInt(memloc).toString(2).padStart(16, "0")); //address
				memalumem(code, machCode,operand + " -> ALU", " 1s compliment ", "ALU -> " + operand );

			}


			// memory in register (NEED TO CHECK MACHINE CODE FOR THIS)
			if (isregister(memloc)) {

				let reg1 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				hexmem = "f" + hexmem;
				let mem = new Register(hexmem.toUpperCase());
				let val = parseInt(mem.getReg(), 2);
				val = 65535 - val;
				let str = val.toString(2);
				mem.setReg(str);


				machCode += "1111011"; //op-code
				machCode += "1" //w-bit (CHANGE THIS CODE WHEN BYTE MOV FUNCTIONALITY ADDED)
				machCode += "00"; //mod
				machCode += "010"; //fixed
				machCode += "111"; //r/m  <- NOT SURE ABOUT THIS
				memalumem(code, machCode,operand + " -> ALU", " 1s compliment ", "ALU -> " + operand );

			}

		}
		updateMachineCode(machCode);
		return machCode;
	}

	if (instruction === "or")//instruction for bitwise and.
	{
		const firstop = words[1].substring(0, words[1].length - 1).toLowerCase();
		const secondop = words[2].toLowerCase();
		if (isregister(firstop))// First operand is a register. This has three cases.
		{
			let reg1 = new Register(firstop.toUpperCase());
			let val1 = parseInt(reg1.getReg(), 2);
			let val2;
			if (isnumber(secondop)) // case1. Second operand is immediete.
			{
				val2 = parseInt(secondop);
			}

			if (isregister(secondop))// case2. Second operand is also a register.
			{
				let reg2 = new Register(secondop.toUpperCase());
				val2 = parseInt(reg2.getReg(), 2);
			}
			if (ismemory(secondop))// case3. Second operand is memory. This further has three cases.
			{
				const memloc = secondop.substring(1, secondop.length - 1); //remove []
				if (isregister(memloc))//case1. Memory is inside reg.
				{
					let reg = new Register(memloc.toUpperCase());
					let hexmem = parseInt(reg.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
					hexmem = "f" + hexmem;
					let mem = new Register(hexmem.toUpperCase());
					val2 = parseInt(mem.getReg(), 2);
				}
				if (isnumber(memloc))//case 2. Memory is given directly.
				{
					let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
					hexmem = "f" + hexmem;
					console.log(hexmem);
					let mem = new Register(hexmem.toUpperCase());
					val2 = parseInt(mem.getReg(), 2);
				}
			}
			console.log(val1, val2, val1 | val2);
			reg1.setReg(val1 | val2);
		}
		if (ismemory(firstop))//First operand is memory. This has two cases.
		{
			const memloc = firstop.substring(1, firstop.length - 1); //remove []
			let val2;
			let val1;
			let mem;
			if (isregister(memloc))//case1. memory is inside a register. This further has two cases.
			{
				let reg1 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				hexmem = "f" + hexmem;
				mem = new Register(hexmem.toUpperCase());
				val1 = parseInt(mem.getReg(), 2);
				if (isregister(secondop))//case 1. Second operand is a register.
				{
					let reg2 = new Register(secondop.toUpperCase());
					val2 = parseInt(reg2.getReg(), 2);
				}
				if (isnumber(secondop))//case2. Second operand is a number.
				{
					val2 = parseInt(secondop);
				}
			}
			if (isnumber(memloc))//case2. Memory available directly. This further has two cases.
			{
				console.log(memloc);
				let hexmem = parseInt(memloc).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;
				console.log(hexmem);
				mem = new Register(hexmem.toUpperCase());
				console.log(memloc);
				val1 = parseInt(mem.getReg(), 2);
				if (isregister(secondop))//case1. Second operand is a register.
				{
					let reg2 = new Register(secondop.toUpperCase());
					val2 = parseInt(reg2.getReg(), 2);
				}
				if (isnumber(secondop))//case2. Second operand is a number.
				{
					val2 = parseInt(secondop);
				}
			}
			mem.setReg(val1 | val2);
		}
	}

	if (instruction === "xor")//instruction for bitwise and.
	{
		const firstop = words[1].substring(0, words[1].length - 1).toLowerCase();
		const secondop = words[2].toLowerCase();
		if (isregister(firstop))// First operand is a register. This has three cases.
		{
			let reg1 = new Register(firstop.toUpperCase());
			let val1 = parseInt(reg1.getReg(), 2);
			let val2;
			if (isnumber(secondop)) // case1. Second operand is immediete.
			{
				val2 = parseInt(secondop);
			}

			if (isregister(secondop))// case2. Second operand is also a register.
			{
				let reg2 = new Register(secondop.toUpperCase());
				val2 = parseInt(reg2.getReg(), 2);
			}
			if (ismemory(secondop))// case3. Second operand is memory. This further has three cases.
			{
				const memloc = secondop.substring(1, secondop.length - 1); //remove []
				if (isregister(memloc))//case1. Memory is inside reg.
				{
					let reg = new Register(memloc.toUpperCase());
					let hexmem = parseInt(reg.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
					hexmem = "f" + hexmem;
					let mem = new Register(hexmem.toUpperCase());
					val2 = parseInt(mem.getReg(), 2);
				}
				if (isnumber(memloc))//case 2. Memory is given directly.
				{
					let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
					hexmem = "f" + hexmem;
					console.log(hexmem);
					let mem = new Register(hexmem.toUpperCase());
					val2 = parseInt(mem.getReg(), 2);
				}
			}
			console.log(val1, val2, val1 ^ val2);
			reg1.setReg(val1 ^ val2);
		}
		if (ismemory(firstop))//First operand is memory. This has two cases.
		{
			const memloc = firstop.substring(1, firstop.length - 1); //remove []
			let val2;
			let val1;
			let mem;
			if (isregister(memloc))//case1. memory is inside a register. This further has two cases.
			{
				let reg1 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				hexmem = "f" + hexmem;
				mem = new Register(hexmem.toUpperCase());
				val1 = parseInt(mem.getReg(), 2);
				if (isregister(secondop))//case 1. Second operand is a register.
				{
					let reg2 = new Register(secondop.toUpperCase());
					val2 = parseInt(reg2.getReg(), 2);
				}
				if (isnumber(secondop))//case2. Second operand is a number.
				{
					val2 = parseInt(secondop);
				}
			}
			if (isnumber(memloc))//case2. Memory available directly. This further has two cases.
			{
				console.log(memloc);
				let hexmem = parseInt(memloc).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;
				console.log(hexmem);
				mem = new Register(hexmem.toUpperCase());
				console.log(memloc);
				val1 = parseInt(mem.getReg(), 2);
				if (isregister(secondop))//case1. Second operand is a register.
				{
					let reg2 = new Register(secondop.toUpperCase());
					val2 = parseInt(reg2.getReg(), 2);
				}
				if (isnumber(secondop))//case2. Second operand is a number.
				{
					val2 = parseInt(secondop);
				}
			}
			mem.setReg(val1 ^ val2);
		}
	}

	if (instruction === "and")//instruction for bitwise and.
	{
		const firstop = words[1].substring(0, words[1].length - 1).toLowerCase();
		const secondop = words[2].toLowerCase();
		if (isregister(firstop))// First operand is a register. This has three cases.
		{
			let reg1 = new Register(firstop.toUpperCase());
			let val1 = parseInt(reg1.getReg(), 2);
			let val2;
			if (isnumber(secondop)) // case1. Second operand is immediete.
			{
				val2 = parseInt(secondop);
			}

			if (isregister(secondop))// case2. Second operand is also a register.
			{
				let reg2 = new Register(secondop.toUpperCase());
				val2 = parseInt(reg2.getReg(), 2);
			}
			if (ismemory(secondop))// case3. Second operand is memory. This further has three cases.
			{
				const memloc = secondop.substring(1, secondop.length - 1); //remove []
				if (isregister(memloc))//case1. Memory is inside reg.
				{
					let reg = new Register(memloc.toUpperCase());
					let hexmem = parseInt(reg.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
					hexmem = "f" + hexmem;
					let mem = new Register(hexmem.toUpperCase());
					val2 = parseInt(mem.getReg(), 2);
				}
				if (isnumber(memloc))//case 2. Memory is given directly.
				{
					let hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
					hexmem = "f" + hexmem;
					console.log(hexmem);
					let mem = new Register(hexmem.toUpperCase());
					val2 = parseInt(mem.getReg(), 2);
				}
			}
			console.log(val1, val2, val1 & val2);
			reg1.setReg(val1 & val2);
		}
		if (ismemory(firstop))//First operand is memory. This has two cases.
		{
			const memloc = firstop.substring(1, firstop.length - 1); //remove []
			let val2;
			let val1;
			let mem;
			if (isregister(memloc))//case1. memory is inside a register. This further has two cases.
			{
				let reg1 = new Register(memloc.toUpperCase());
				let hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				hexmem = "f" + hexmem;
				mem = new Register(hexmem.toUpperCase());
				val1 = parseInt(mem.getReg(), 2);
				if (isregister(secondop))//case 1. Second operand is a register.
				{
					let reg2 = new Register(secondop.toUpperCase());
					val2 = parseInt(reg2.getReg(), 2);
				}
				if (isnumber(secondop))//case2. Second operand is a number.
				{
					val2 = parseInt(secondop);
				}
			}
			if (isnumber(memloc))//case2. Memory available directly. This further has two cases.
			{
				console.log(memloc);
				let hexmem = parseInt(memloc).toString(16); // converts int num inside brackets to hex
				hexmem = "f" + hexmem;
				console.log(hexmem);
				mem = new Register(hexmem.toUpperCase());
				console.log(memloc);
				val1 = parseInt(mem.getReg(), 2);
				if (isregister(secondop))//case1. Second operand is a register.
				{
					let reg2 = new Register(secondop.toUpperCase());
					val2 = parseInt(reg2.getReg(), 2);
				}
				if (isnumber(secondop))//case2. Second operand is a number.
				{
					val2 = parseInt(secondop);
				}
			}
			mem.setReg(val1 & val2);
		}
	}
	
	if (instruction === "add")
	{
		const firstop = words[1].substring(0, words[1].length - 1).toLowerCase();
		const secondop = words[2].toLowerCase();
		let machCode = "";
		if (isregister(firstop))// First operand is a register. This has three cases.
		{
			let reg1 = new Register(firstop.toUpperCase());
			let val1;
			let val2;
			
			if (is8byteregister(firstop))
			{
				if(firstop[1] == "l") val1 = parseInt(reg1.getLowerByte(), 2);
				else val1 = parseInt(reg1.getHigherByte(), 2);
			}
			else val1 = parseInt(reg1.getReg(), 2);
			
			if (isnumber(secondop)) // case1. Second operand is immediete.
			{
				val2 = parseInt(secondop);
				
				machCode += "100000"; //opcode
				machCode += "0"; // s-bit 
				// w-bit added at end
				machCode += "11"; // mod
				machCode += "000"; // fixed
				machCode += getRegCode(firstop); // r/m				
				if (is8byteregister(firstop))
					machCode += parseInt(secondop).toString(2).padStart(8, "0").substr(0,8); //data
				else 
					machCode += getLittleEndian(parseInt(secondop).toString(2).padStart(16, "0")); //data
			}

			if (isregister(secondop))// case2. Second operand is also a register.
			{
				let reg2 = new Register(secondop.toUpperCase());
				if (is8byteregister(secondop))
				{
					if(secondop[1] == "l") val2 = parseInt(reg2.getLowerByte(), 2);
					else val2 = parseInt(reg2.getHigherByte(), 2);
				}
				else val2 = parseInt(reg2.getReg(), 2);
				console.log(val2);
				machCode += "000000"; //opcode
				machCode += "0"; // d-bit
				// w-bit added at end
				machCode += "11"; // mod
				machCode += getRegCode(firstop); // reg
				machCode += getRegCode(secondop); // r/m
			}
			if (ismemory(secondop))// case3. Second operand is memory.
			{
				const memloc = secondop.substring(1, secondop.length - 1); //remove []
				let hexmem;
				
				machCode += "000000"; //opcode
				machCode += "1"; // d-bit
				// w-bit added at end
				machCode += "00"; // mod
				machCode += getRegCode(firstop); // reg
				
				if (isregister(memloc))//case1. Memory is inside reg.
				{
					let reg2 = new Register(memloc.toUpperCase());
					hexmem = parseInt(reg2.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
					
					machCode += "111" // r/m <- NOT USRE ABOUT THIS
				}
				if (isnumber(memloc))//case 2. Memory is given directly.
				{
					hexmem = parseInt(memloc, 10).toString(16); // converts int num inside brackets to hex
					
					machCode += "110" // r/m					
					machCode += getLittleEndian(parseInt(memloc).toString(2).padStart("1", 16)); //address
				}				
				hexmem = "f" + hexmem;
				let mem = new Register(hexmem.toUpperCase());
				val2 = parseInt(mem.getReg(), 2);
			}
			
			if (is8byteregister(firstop))
			{
				if(firstop[1] == "l") reg1.setLowerByte(val1 + val2);
				else reg1.setHigherByte(val1 + val2);
				
				machCode = machCode.substr(0,7) + "0" + machCode.substr(7);
			}
			else 
			{
				reg1.setReg(val1 + val2);
				machCode = machCode.substr(0,7) + "1" + machCode.substr(7);
			}
		}
		if (ismemory(firstop))//First operand is memory. This has two cases.
		{
			const memloc = firstop.substring(1, firstop.length - 1); //remove []
			let hexmem;
			let val1;
			let reg1;
			let val2;
			let rmCode;
			
			if (isregister(memloc))//case1. memory is inside a register
			{
				reg1 = new Register(memloc.toUpperCase());
				hexmem = parseInt(reg1.getReg().padStart(16, "0"), 2).toString(16); //contains hex of reg1 data.
				rmCode = "111";
			}
			if (isnumber(memloc))//case2. Memory available directly
			{
				hexmem = parseInt(memloc).toString(16); // converts int num inside brackets to hex
				rmCode = "110"
				rmCode += getLittleEndian(parseInt(memloc).toString(2).padStart("1", 16)); //address
			}
			
			hexmem = "f" + hexmem;
			let mem = new Register(hexmem.toUpperCase());
			val1 = parseInt(mem.getReg(), 2);			
			
			if (isregister(secondop))//case 1. Second operand is a register.
			{
				machCode += "000000"; //opcode
				machCode += "0"; // d-bit
				
				let reg2 = new Register(secondop.toUpperCase());
				if (is8byteregister(secondop))
				{
					if(secondop[1] == "l") val2 = parseInt(reg2.getLowerByte(), 2);
					else val2 = parseInt(reg2.getHigherByte(), 2);
					
					machCode += "0" // w-bit
				}
				else 
				{
					val2 = parseInt(reg2.getReg(), 2);
					
					machCode += "1" // w-bit
				}
				
				machCode += "00"; // mod
				machCode += getRegCode(secondop); // reg
				machCode += rmCode; // r/m
			}
			if (isnumber(secondop))//case2. Second operand is a number.
			{
				val2 = parseInt(secondop);
				
				machCode += "100000"; //opcode
				machCode += "0"; // s-bit 
				machCode += ( val2 <= 255 ? "0" : "1" );								
				machCode += "00"; // mod
				machCode += "000"; // fixed
				machCode += rmCode; // r/m
				machCode += getLittleEndian(parseInt(secondop).toString(2).padStart(16, "0")); //data
			}
			mem.setReg(val1 + val2);
		}
		updateMachineCode(machCode);
		return machCode;
	}

	if (instruction == "jmp") {
		const oprand = words[1].toLowerCase();
		let machCode = "";

		let jmpline = getLabelLine(oprand);
		if (jmpline != -1) {
			lineNo = jmpline;

			machCode += "11101010";
			machCode += jmpline.toString(2).padStart(16, "0");
		}
		else {
			console.log("ERROR: jmp called on unrecognized label");
			machCode += "NAN";
		}
		updateMachineCode(machCode);
		return machCode;
	}

}
