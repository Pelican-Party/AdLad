/**
 * Helper class that allows plugins to change booleans such as `needsPause`, `needsMute` etc.
 * This keeps track of the current state and takes care of events.
 */
export class PluginBooleanState {
	/**
	 * @param {boolean} value
	 */
	constructor(value) {
		/** @private */
		this._value = value;

		/** @private @type {Set<(value: boolean) => void>} */
		this._onChangeCbs = new Set();
	}

	get value() {
		return this._value;
	}

	/**
	 * @param {(value: boolean) => void} cb
	 */
	onChange(cb) {
		this._onChangeCbs.add(cb);
	}

	/**
	 * @param {(value: boolean) => void} cb
	 */
	removeOnChange(cb) {
		this._onChangeCbs.delete(cb);
	}

	/**
	 * @param {boolean} value
	 */
	setValue(value) {
		if (value == this._value) return;
		this._value = value;
		this._onChangeCbs.forEach((cb) => cb(value));
	}
}
