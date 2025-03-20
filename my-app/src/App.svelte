	<!-- App.svelte -->
	<script>
		import Router from 'svelte-spa-router';
		import Login from "./Login.svelte";
		import Admin from "./Admin.svelte";
		import Manager from "./Manager.svelte";
		import Employee from "./Employee.svelte";
		import ChangePassword from "./ChangePassword.svelte";
		const routes = {
		"/": Login,
		"/login": Login,
		"/admin": Admin,
		"/manager": Manager,
		"/employee": Employee,
		"/change-password": ChangePassword,
		};
	</script>

	
	
	<main>
		<Router {routes} />
	</main>
	
	<style>
		main {
		text-align: center;
		padding: 1em;
		max-width: 960px;
		margin: 0 auto;
		}
	</style>
	