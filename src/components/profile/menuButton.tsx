import { profileStyles } from "@/assets/styles/profile.style";
import { useTheme } from "@/context/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

export const MenuButton = ({
  item,
  onPress,
}: {
  item: any;
  onPress: () => void;
}) => {
  const { theme } = useTheme();
  const style = profileStyles(theme);
  return (
    <TouchableOpacity
      style={style.menuRow}
      activeOpacity={0.82}
      onPress={onPress}
    >
      <View style={style.menuIconWrap}>
        <MaterialIcons
          name={item.icon}
          size={21}
          color={style.avatarText.color}
        />
      </View>
      <View style={style.menuTextWrap}>
        <Text style={style.menuLabel}>{item.label}</Text>
        <Text style={style.menuDescription}>{item.description}</Text>
      </View>
      <MaterialIcons
        name="keyboard-arrow-right"
        size={24}
        color={style.eyebrow.color}
      />
    </TouchableOpacity>
  );
};
