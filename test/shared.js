export function waitForMicroTasks() {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}
