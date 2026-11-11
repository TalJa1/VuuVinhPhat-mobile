import React from 'react';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import HomeStack from './HomeStack';
import GuideStack from './GuideStack';
import ScanStack from './ScanStack';
import AssistantScreen from '../screens/AssistantScreen';
import ScanHistoryScreen from '../screens/ScanHistoryScreen';
import FloatingTabBar from './FloatingTabBar';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();

const renderTabBar = (props: BottomTabBarProps) => <FloatingTabBar {...props} />;

function BottomTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.waterTop },
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
      <Tab.Screen name="Scan" component={ScanStack} />
      <Tab.Screen name="History" component={ScanHistoryScreen} />
      <Tab.Screen name="Guide" component={GuideStack} />
    </Tab.Navigator>
  );
}

export default BottomTabs;
