import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://usrufzbwyxjtsggifznd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcnVmemJ3eXhqdHNnZ2lmem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzY2NjY3OTAsImV4cCI6MTk5MjI0Mjc5MH0.4dpAqo3xuDlq9xl-psq4ZcaKdRsDyiUycQfnEahTzRk';

const supabase = createClient(supabaseUrl, supabaseKey);

interface DuckbaseAuthSettings {
	username: string;
	password: string;
}

const DEFAULT_SETTINGS: DuckbaseAuthSettings = {
	username: 'login@email.com',
	password: 'somepassword'
}

export default class MyPlugin extends Plugin {
	duckbase_auth_settings: DuckbaseAuthSettings;

	async onload() {
		console.log('Plugin loaded');
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Duckbase', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('Hi!');
		// });
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');
		const ribbonIconEl = this.addRibbonIcon('dice', 'Send all notes to my app', () => {
			this.sendAllNotesToMyApp();
		  });

		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new LoginSettings(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	async sendAllNotesToMyApp() {
		new Notice("Duckbase Plugin Message:\nSending your notes to Duckbase. This may take a few minutes...")

		const { data, error } = await supabase.auth.signInWithPassword({
			email: this.duckbase_auth_settings.username,
			password: this.duckbase_auth_settings.password,
		})

		console.log(JSON.stringify(data))

		if (data.session === null) {
			new Notice("Duckbase Plugin Error:\nYou do not have the correct authentication details entered.\nGo to the Duckbase Plugin settings in Obsidian and update them.", 7000)
			return
		}

		const allNotes = this.app.vault.getMarkdownFiles();
		const noteData = [];
	
		// Iterate through all notes and construct the data to send to the API endpoint
		for (const note of allNotes) {
		  const noteContents = await this.app.vault.read(note);
		  const data = {
			url: note.path,
			date_modified: new Date(note.stat.mtime).toISOString(), 
			title: note.basename,
			content: noteContents,
		  };
		  noteData.push(data);
		}
		console.log(JSON.stringify(noteData))
		const payload = { notes: noteData };
		// Send the data to the API endpoint
		const response = await fetch('https://rolun--rest-api-fastapi-app.modal.run/batch_obsidian', {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${data.session.access_token}`
			// add any authentication headers or tokens as needed
		  },
		  body: JSON.stringify(payload),
		});
	
		if (!response.ok) {
			new Notice("Duckbase Plugin Error:\nSomething went wrong.")
		  	console.error('Error sending data to remote API:', response.status, response.statusText);
		} else {
			new Notice("Duckbase Plugin Message:\nData has been sent successfully! :)")
		  	console.log('Data sent successfully');
		}
	}
	

	onunload() {

	}

	async loadSettings() {
		this.duckbase_auth_settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.duckbase_auth_settings);
	}
}

class LoginSettings extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Duckbase Settings.'});

		new Setting(containerEl)
			.setName('Duckbase Username')
			.setDesc('Your Duckbase email')
			.addText(text => text
				.setPlaceholder('login@email.com')
				.setValue(this.plugin.duckbase_auth_settings.username)
				.onChange(async (value) => {
					console.log('Username: ' + value);
					this.plugin.duckbase_auth_settings.username = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Duckbase Password')
			.setDesc('Your Duckbase Password')
			.addText(text => text
				.setPlaceholder('somepassword')
				.setValue(this.plugin.duckbase_auth_settings.password)
				.onChange(async (value) => {
					console.log('Password: ' + value);
					this.plugin.duckbase_auth_settings.password = value;
					await this.plugin.saveSettings();
				}));
	}
}
