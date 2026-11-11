import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import GuideScreen from '../screens/GuideScreen';
import GuideDetailScreen from '../screens/GuideDetailScreen';

export type GuideStackParamList = {
  GuideMain: undefined;
  GuideDetail: {
    guideId: string;
    title: string;
    category: 'cleaning' | 'classification' | 'emergency';
  };
};

const Stack = createNativeStackNavigator<GuideStackParamList>();

function GuideStack() {
  return (
    <Stack.Navigator
      initialRouteName="GuideMain"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.waterTop },
      }}
    >
      <Stack.Screen
        name="GuideMain"
        component={GuideScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GuideDetail"
        options={{ headerShown: false }}
        component={GuideDetailScreen}
      />
    </Stack.Navigator>
  );
}

export default GuideStack;