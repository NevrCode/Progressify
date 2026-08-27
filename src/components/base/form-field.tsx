import { useTheme } from "@/context/ThemeContext";
import { forwardRef, ReactNode } from "react";
import {
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

type FormFieldProps = TextInputProps & {
  label?: string;
  helperText?: string;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export const FormField = forwardRef<TextInput, FormFieldProps>(
  function FormField(
    {
      label,
      helperText,
      error,
      leading,
      trailing,
      containerStyle,
      style,
      multiline,
      placeholderTextColor,
      ...props
    },
    ref,
  ) {
    const { theme } = useTheme();
    const description = error ?? helperText;

    return (
      <View style={[{ gap: 7 }, containerStyle]}>
        {label ? (
          <Text
            style={{
              color: theme.textBlack,
              fontSize: 12,
              fontFamily: "PlusJakartaSans_700Bold",
            }}
          >
            {label}
          </Text>
        ) : null}
        <View
          style={{
            minHeight: multiline ? 96 : 48,
            flexDirection: "row",
            alignItems: multiline ? "flex-start" : "center",
            gap: 10,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderCurve: "continuous",
            borderWidth: 1.5,
            borderColor: error ? theme.expense : theme.border,
            backgroundColor: theme.card,
          }}
        >
          {leading}
          <TextInput
            ref={ref}
            accessibilityLabel={props.accessibilityLabel ?? label}
            accessibilityHint={description}
            multiline={multiline}
            placeholderTextColor={placeholderTextColor ?? theme.textLight}
            style={[
              {
                flex: 1,
                minHeight: multiline ? 92 : 44,
                paddingVertical: multiline ? 12 : 0,
                color: theme.textBlack,
                fontSize: 14,
                fontFamily: "PlusJakartaSans_500Medium",
                textAlignVertical: multiline ? "top" : "center",
              },
              style,
            ]}
            {...props}
          />
          {trailing}
        </View>
        {description ? (
          <Text
            accessibilityLiveRegion={error ? "polite" : "none"}
            style={{
              color: error ? theme.expense : theme.textLight,
              fontSize: 11,
              fontFamily: "PlusJakartaSans_500Medium",
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
    );
  },
);
