//Note: this is an automatically created file, do not edit
//File created in 02_q_curves_from-cover-vs-biomass.R script
//These are adjusted q-curved to use with stepwat biomass output
//these are based on cover-biomass relationships.
//note that annualQBio1 is based on the rap cover-biomass relationship
//but 'annualQBioMahood' is based on the mahood equation



exports.annualQBio1 = [
	[0, 1, 1, 1],
	[1.01433844243667, 0.98, 0.98, 1],
	[1.90905956490302, 0.95, 0.95, 1],
	[4.28111869978463, 0.9, 0.9, 1],
	[11.1515550240524, 0.5, 0.5, 1],
	[18.0074983299093, 0.25, 0.25, 0.75],
	[25.6702682687555, 0.1, 0.1, 0.55],
	[33.5948289894852, 0, 0, 0.4],
	[75.866465333565, 0, 0, 0.2],
	[119.891940990663, 0, 0, 0],
	[163.968609583979, 0, 0, 0]
];


exports.annualQBioMahood = [
	[2.3409, 1, 1, 1],
	[28.1531076473007, 0.98, 0.98, 1],
	[37.8788015079992, 0.95, 0.95, 1],
	[56.2545225897688, 0.9, 0.9, 1],
	[99.4663409391077, 0.5, 0.5, 1],
	[140.917448535184, 0.25, 0.25, 0.75],
	[181.457145179538, 0.1, 0.1, 0.55],
	[221.4144, 0, 0, 0.4],
	[416.557938236503, 0, 0, 0.2],
	[607.764407539996, 0, 0, 0],
	[796.9329, 0, 0, 0]
];


exports.perennialQBio1 = [
	[0, 0, 0, 0],
	[1.43646762331409, 0.02, 0.02, 0],
	[2.71950647439146, 0.05, 0.05, 0],
	[5.39581358921283, 0.45, 0.45, 0.2],
	[12.8354173143354, 1, 0.7, 0.7],
	[20.702129344627, 1, 0.88, 0.88],
	[29.4794234468341, 1, 0.94, 0.94],
	[38.7689730259066, 1, 1, 0.95],
	[86.3677337444892, 1, 1, 1],
	[125.486234423977, 1, 1, 1],
	[172.903384947955, 1, 1, 1]
];


exports.sageQBio1 = [
	[-3.12522822779307, 0, 0, 0.33],
	[54.8373858861035, 0.05, 0.05, 0.5],
	[83.8186929430517, 0.1, 0.1, 0.7],
	[141.781307056948, 0.5, 0.5, 0.9],
	[286.68784234169, 1, 0.75, 0.95],
	[431.594377626431, 1, 0.9, 1],
	[576.500912911172, 1, 0.95, 1],
	[721.407448195914, 1, 1, 1],
	[1445.94012461962, 1, 1, 1],
	[2170.47280104333, 1, 1, 1],
	[2895.00547746703, 1, 1, 1]
];

/*
Slope and intercept for linear functions that convert biomass
to cover for sage, pfg and afg
These lists also created in 02_q_curves_from-cover-vs-biomass.R
*/


//sage equation (from Carpenter)

exports.b0b1sage1 = [0.107836,0.034505]

//afg equation (derived from RAP)

exports.b0b1afg1 = [2.45697389448814,0.631888032850675]

//pfg equation (derived from RAP)

exports.b0b1pfg1 = [4.83337001490401,0.507274442336331]

