import { CommonActions, NavigationState, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { navigationRef } from "../navigationRef";
import { AppStacks, NavigationParams, ScreenNames, StackNames } from "../types/navigation.types";

export const useAppNavigation = () => {

    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    /* -------------------------------------------------------
     * 1) Obtiene la pantalla actual (Stack + Screen + Params)
     * -------------------------------------------------------*/
    const getCurrentScreen = () => {
        const state = navigation.getState() as NavigationState;

        if (!state) return null;
        const route = state.routes[state.index];

        const currentStack = Object.keys(AppStacks).find((stack:any) =>
            AppStacks[stack] && Object.keys(AppStacks[stack] as object).includes(route.name)
        ) as StackNames | undefined;

        return {
            stack: currentStack,
            screen: route.name,
            params: route.params ?? null,
        };
    };

    /* -------------------------------------------------------
     * 2) Navegación tipada por stack + screen (tu estilo)
     * -------------------------------------------------------*/
    const navigateToScreen = <
        T extends StackNames,
        S extends ScreenNames<T>
    >(
        stack: T,
        screen: S,
        params?: NavigationParams<T, S>,
        headerShown = true
    ) => {

        navigation.navigate(stack as any, {
            screen,
            params,
            headerShown,
        });
    };

    /* -------------------------------------------------------
     * 3) Retroceder
     * -------------------------------------------------------*/
    const goBack = () => navigation.goBack();

    /* -------------------------------------------------------
     * 4) Reset hacia el Drawer Main
     * -------------------------------------------------------*/
    const resetToHome = () => {
        if (navigationRef.isReady()) {
            navigationRef.reset({
                index: 0,
                routes: [{ name: "Tabs" }],
            });
        }
    };

    /* -------------------------------------------------------
     * 5) Reset hacia un módulo específico (Limpia el stack)
     * -------------------------------------------------------*/
    const resetToModule = (stack: StackNames, screen: string, params?: any) => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [
                    {
                        name: stack,
                        state: {
                            routes: [{ name: screen, params }],
                        },
                    },
                ],
            })
        );
    };

    return { getCurrentScreen, navigateToScreen, goBack, resetToHome, resetToModule };
};
