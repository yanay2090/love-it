import { AppTabBar } from '@/src/components/AppTabBar';
import { Tabs, useRouter } from 'expo-router';

export default function TabsLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => (
        <AppTabBar
          active={state.routes[state.index]?.name === 'me' ? 'me' : 'explore'}
          onExplore={() => {
            const route = state.routes.find((item) => item.name === 'index');
            if (route) navigateToTab(route.key);
          }}
          onMe={() => {
            const route = state.routes.find((item) => item.name === 'me');
            if (route) navigateToTab(route.key);
          }}
          onAdd={() => router.push('/add')}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Explore' }} />
      <Tabs.Screen name="me" options={{ title: 'My page' }} />
    </Tabs>
  );
}
