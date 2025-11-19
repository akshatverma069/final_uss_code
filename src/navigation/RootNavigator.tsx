import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Auth Screens
import Logscreen from "../screens/Logscreen";
import Signupscreen from "../screens/Signupscreen";
import Forgotpasswordscreen from "../screens/Forgotpasswordscreen";
import Resetpasswordscreen from "../screens/Resetpasswordscreen";

// Main Screens with Bottom Tabs
import HomeWrapper from "../screens/HomeWrapper";
import VaultWrapper from "../screens/VaultWrapper";
import GroupsWrapper from "../screens/GroupsWrapper";
import SettingsWrapper from "../screens/SettingsWrapper";
import FAQsWrapper from "../screens/FAQsWrapper";

// Detail Screens
import PasswordDetailsscreen from "../screens/PasswordDetailsscreen";
import SecurityWrapper from "../screens/SecurityWrapper";
import AddPasswordscreen from "../screens/AddPasswordscreen";
import SelectGroupsscreen from "../screens/SelectGroupsscreen";
import Messagesscreen from "../screens/Messagesscreen";
import SecurityDetailsscreen from "../screens/SecurityDetailsscreen";
import GroupDetailsscreen from "../screens/GroupDetailsscreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth Flow */}
        <Stack.Screen name="Login" component={Logscreen} />
        <Stack.Screen name="Signup" component={Signupscreen} />
        <Stack.Screen name="ForgotPassword" component={Forgotpasswordscreen} />
        <Stack.Screen name="ResetPassword" component={Resetpasswordscreen} />

        {/* Main Screens with Bottom Tabs */}
        <Stack.Screen name="Home" component={HomeWrapper} />
        <Stack.Screen name="Vault" component={VaultWrapper} />
        <Stack.Screen name="Groups" component={GroupsWrapper} />
        <Stack.Screen name="Settings" component={SettingsWrapper} />
        <Stack.Screen name="FAQs" component={FAQsWrapper} />

        {/* Detail Screens */}
        <Stack.Screen name="PasswordDetails" component={PasswordDetailsscreen} />
        <Stack.Screen name="Security" component={SecurityWrapper} />
        <Stack.Screen name="AddPassword" component={AddPasswordscreen} />
        <Stack.Screen name="SelectGroups" component={SelectGroupsscreen} />
        <Stack.Screen name="Messages" component={Messagesscreen} />
        <Stack.Screen name="SecurityDetails" component={SecurityDetailsscreen} />
        <Stack.Screen name="GroupDetails" component={GroupDetailsscreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
