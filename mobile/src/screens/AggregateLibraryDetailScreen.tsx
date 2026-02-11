import React from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAggregateLibraryStore } from '../state/aggregateLibraryStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { RouteProp } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AggregateLibraryDetail'>;
  route: RouteProp<RootStackParamList, 'AggregateLibraryDetail'>;
};

const AggregateLibraryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { aggregateId } = route.params;
  const { getAggregate, deleteAggregate, isAggregateComplete, toggleFavorite, duplicateAggregate, trackAccess } = useAggregateLibraryStore();
  
  const aggregate = getAggregate(aggregateId);

  // Track access when viewing
  React.useEffect(() => {
    if (aggregateId) {
      trackAccess(aggregateId);
    }
  }, [aggregateId, trackAccess]);

  if (!aggregate) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-8">
        <Ionicons name="alert-circle-outline" size={64} color="#9ca3af" />
        <Text className="text-lg text-gray-600 mt-4 text-center">
          Aggregate not found
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-6 bg-blue-600 rounded-lg px-6 py-3 active:bg-blue-700"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isComplete = isAggregateComplete(aggregateId);

  const handleEdit = () => {
    navigation.navigate('AggregateLibraryAddEdit', { aggregateId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Aggregate',
      `Are you sure you want to delete "${aggregate.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAggregate(aggregateId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDuplicate = async () => {
    const duplicated = await duplicateAggregate(aggregateId);
    if (duplicated) {
      Alert.alert(
        'Duplicate Created',
        `"${duplicated.name}" has been created. Would you like to edit it now?`,
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Edit',
            onPress: () => navigation.replace('AggregateLibraryAddEdit', { aggregateId: duplicated.id }),
          },
        ]
      );
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(aggregateId);
  };

  const renderField = (label: string, value: string | number | null | undefined, unit?: string) => {
    if (value === null || value === undefined) return null;
    
    return (
      <View className="mb-3">
        <Text className="text-xs text-gray-500 mb-0.5">{label}</Text>
        <Text className="text-base text-gray-900 font-medium">
          {value}{unit ? ` ${unit}` : ''}
        </Text>
      </View>
    );
  };

  const renderSection = (title: string, content: React.ReactNode, isEmpty?: boolean) => {
    if (isEmpty) return null;
    
    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm">
        <Text className="text-lg font-semibold text-gray-900 mb-3">{title}</Text>
        {content}
      </View>
    );
  };

  const hasPhysical = !!(
    aggregate.finenessModulus ||
    aggregate.dryRoddedUnitWeight ||
    aggregate.percentVoids ||
    aggregate.absorption ||
    aggregate.moistureContent ||
    aggregate.maxSize
  );

  const hasSpecificGravity = !!(
    aggregate.specificGravityBulkSSD ||
    aggregate.specificGravityBulkDry ||
    aggregate.specificGravityApparent
  );

  const hasPerformance = !!(
    aggregate.laAbrasion ||
    aggregate.soundness ||
    aggregate.deleteriousMaterials ||
    aggregate.organicImpurities ||
    aggregate.clayLumps
  );

  const hasChemical = !!(
    aggregate.asrReactivity ||
    aggregate.chlorideContent ||
    aggregate.sulfateContent
  );

  const hasProduction = !!(
    aggregate.costPerTon ||
    aggregate.costPerYard ||
    aggregate.lastTestDate ||
    aggregate.certifications ||
    aggregate.notes
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header Card */}
        <View className="bg-white p-4 border-b border-gray-200">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {aggregate.name}
              </Text>
              {aggregate.source && (
                <Text className="text-base text-gray-600">{aggregate.source}</Text>
              )}
            </View>
            
            {!isComplete && (
              <View className="bg-orange-100 px-3 py-1.5 rounded-lg">
                <Text className="text-xs font-semibold text-orange-700">
                  INCOMPLETE
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap gap-2 mt-3">
            <View className={`px-3 py-1.5 rounded-full ${
              aggregate.type === 'Fine' ? 'bg-green-100' : 'bg-purple-100'
            }`}>
              <Text className={`text-sm font-semibold ${
                aggregate.type === 'Fine' ? 'text-green-700' : 'text-purple-700'
              }`}>
                {aggregate.type}
              </Text>
            </View>

            {aggregate.colorFamily && (
              <View className="px-3 py-1.5 rounded-full bg-gray-100">
                <Text className="text-sm font-semibold text-gray-700">
                  {aggregate.colorFamily}
                </Text>
              </View>
            )}

            {aggregate.stockpileNumber && (
              <View className="px-3 py-1.5 rounded-full bg-blue-100">
                <Text className="text-sm font-semibold text-blue-700">
                  {aggregate.stockpileNumber}
                </Text>
              </View>
            )}
          </View>

          {!isComplete && (
            <View className="mt-4 bg-orange-50 rounded-lg p-3 border border-orange-200">
              <View className="flex-row items-start">
                <Ionicons name="warning" size={18} color="#c2410c" />
                <Text className="flex-1 text-xs text-orange-700 ml-2">
                  This aggregate is missing required data. Tap Edit to complete the profile.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View className="p-4">
          {/* Physical Properties */}
          {renderSection(
            'Physical Properties',
            <>
              {aggregate.type === 'Fine' && renderField('Fineness Modulus', aggregate.finenessModulus)}
              {renderField('Dry-Rodded Unit Weight', aggregate.dryRoddedUnitWeight, 'lb/ft³')}
              {renderField('Percent Voids', aggregate.percentVoids, '%')}
              {renderField('Absorption', aggregate.absorption, '%')}
              {renderField('Moisture Content', aggregate.moistureContent, '%')}
              {renderField('Maximum Size', aggregate.maxSize, 'in')}
            </>,
            !hasPhysical
          )}

          {/* Specific Gravity */}
          {renderSection(
            'Specific Gravity',
            <>
              {renderField('Bulk (SSD)', aggregate.specificGravityBulkSSD)}
              {renderField('Bulk (Dry)', aggregate.specificGravityBulkDry)}
              {renderField('Apparent', aggregate.specificGravityApparent)}
            </>,
            !hasSpecificGravity
          )}

          {/* Performance Properties */}
          {renderSection(
            'Performance Properties',
            <>
              {renderField('LA Abrasion', aggregate.laAbrasion, '%')}
              {renderField('Soundness', aggregate.soundness, '%')}
              {renderField('Deleterious Materials', aggregate.deleteriousMaterials, '%')}
              {renderField('Organic Impurities', aggregate.organicImpurities)}
              {renderField('Clay Lumps', aggregate.clayLumps, '%')}
            </>,
            !hasPerformance
          )}

          {/* Chemical Properties */}
          {renderSection(
            'Chemical Properties',
            <>
              {renderField('ASR Reactivity', aggregate.asrReactivity)}
              {renderField('Chloride Content', aggregate.chlorideContent, '%')}
              {renderField('Sulfate Content', aggregate.sulfateContent, '%')}
            </>,
            !hasChemical
          )}

          {/* Production & Admin */}
          {renderSection(
            'Production & Admin',
            <>
              {renderField('Cost Per Ton', aggregate.costPerTon, '$')}
              {renderField('Cost Per Cubic Yard', aggregate.costPerYard, '$')}
              {renderField('Last Test Date', aggregate.lastTestDate)}
              {renderField('Certifications', aggregate.certifications)}
              {aggregate.notes && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 mb-0.5">Notes</Text>
                  <Text className="text-base text-gray-900">{aggregate.notes}</Text>
                </View>
              )}
            </>,
            !hasProduction
          )}

          {/* Metadata */}
          <View className="bg-gray-100 rounded-lg p-3 mt-2">
            <Text className="text-xs text-gray-600">
              Created: {new Date(aggregate.createdAt).toLocaleDateString()} at {new Date(aggregate.createdAt).toLocaleTimeString()}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">
              Last Updated: {new Date(aggregate.updatedAt).toLocaleDateString()} at {new Date(aggregate.updatedAt).toLocaleTimeString()}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mt-6 mb-8">
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleEdit}
                className="flex-1 bg-blue-600 rounded-lg py-4 items-center active:bg-blue-700 flex-row justify-center"
              >
                <Ionicons name="pencil" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">Edit</Text>
              </Pressable>

              <Pressable
                onPress={handleToggleFavorite}
                className={`rounded-lg px-6 py-4 items-center flex-row ${
                  aggregate.isFavorite ? 'bg-yellow-500 active:bg-yellow-600' : 'bg-gray-400 active:bg-gray-500'
                }`}
              >
                <Ionicons name={aggregate.isFavorite ? "star" : "star-outline"} size={20} color="white" />
              </Pressable>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={handleDuplicate}
                className="flex-1 bg-green-600 rounded-lg py-4 items-center active:bg-green-700 flex-row justify-center"
              >
                <Ionicons name="copy" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">Duplicate</Text>
              </Pressable>

              <Pressable
                onPress={handleDelete}
                className="bg-red-600 rounded-lg px-6 py-4 items-center active:bg-red-700 flex-row"
              >
                <Ionicons name="trash" size={20} color="white" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AggregateLibraryDetailScreen;
