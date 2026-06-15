import { db } from './db';
import { isSameMaterialFamily } from './inventory-recipe-validation';

export async function findParentMaterialFulfillment(input: {
  childMaterialId: string;
  requiredChildQtyBase: number;
  orderId?: string;
  productionJobId?: string;
  optimizationMode?: string;
}) {
  const { childMaterialId, requiredChildQtyBase, optimizationMode = 'LOWEST_COST' } = input;

  const childMaterial = await db.inventoryItem.findUnique({
    where: { id: childMaterialId },
  });

  if (!childMaterial) {
    throw new Error('Vật tư không tồn tại');
  }

  const availableChildQtyBase = childMaterial.currentStockBase - childMaterial.reservedStockBase;

  if (availableChildQtyBase >= requiredChildQtyBase) {
    return {
      childMaterialId,
      requiredChildQtyBase,
      availableChildQtyBase,
      shortageChildQtyBase: 0,
      status: 'AVAILABLE_DIRECT',
      directCanFulfill: true,
      parentOptions: [],
    };
  }

  const shortageChildQtyBase = requiredChildQtyBase - availableChildQtyBase;

  const recipes = await db.materialConversionRecipe.findMany({
    where: {
      toMaterialId: childMaterialId,
      isActive: true,
    },
    include: {
      fromMaterial: true,
    },
  });

  const validRecipes = recipes.filter(r => isSameMaterialFamily(r.fromMaterial, childMaterial));

  if (validRecipes.length === 0) {
    return {
      childMaterialId,
      requiredChildQtyBase,
      availableChildQtyBase,
      shortageChildQtyBase,
      status: 'MISSING_RECIPE',
      directCanFulfill: false,
      parentOptions: [],
    };
  }

  const parentOptions = validRecipes.map((recipe) => {
    const parent = recipe.fromMaterial;
    const parentAvailableQtyBase = parent.currentStockBase - parent.reservedStockBase;
    const piecesPerParentSheet = recipe.piecesPerParentSheet;

    const requiredParentQtyBase = Math.ceil(shortageChildQtyBase / piecesPerParentSheet);
    const expectedChildQtyBase = requiredParentQtyBase * piecesPerParentSheet;
    const surplusChildQtyBase = expectedChildQtyBase - shortageChildQtyBase;
    
    const canFulfill = parentAvailableQtyBase >= requiredParentQtyBase;

    // Dimensions
    const parentWidthCm = recipe.fromWidthCm || 0;
    const parentHeightCm = recipe.fromHeightCm || 0;
    const childWidthCm = recipe.toWidthCm || 0;
    const childHeightCm = recipe.toHeightCm || 0;

    const parentAreaCm2 = parentWidthCm * parentHeightCm;
    const childAreaCm2 = childWidthCm * childHeightCm;
    const totalParentAreaUsedCm2 = parentAreaCm2 * requiredParentQtyBase;
    const requiredChildAreaCm2 = childAreaCm2 * shortageChildQtyBase;
    const expectedChildAreaCm2 = childAreaCm2 * expectedChildQtyBase;
    const trimWasteAreaPerParentCm2 = parentAreaCm2 > 0 && childAreaCm2 > 0 ? parentAreaCm2 - (childAreaCm2 * piecesPerParentSheet) : 0;
    const totalTrimWasteAreaCm2 = trimWasteAreaPerParentCm2 * requiredParentQtyBase;
    const trimWasteRate = parentAreaCm2 > 0 ? (trimWasteAreaPerParentCm2 / parentAreaCm2) * 100 : 0;

    // Cost
    const parentCostPerSheet = parent.lastPurchaseCost || parent.standardCost || 0;
    const hasCostData = parentCostPerSheet > 0;
    const totalParentCost = requiredParentQtyBase * parentCostPerSheet;
    const costPerExpectedChildSheet = expectedChildQtyBase > 0 ? Math.floor(totalParentCost / expectedChildQtyBase) : 0;
    const costPerRequiredChildSheet = shortageChildQtyBase > 0 ? Math.floor(totalParentCost / shortageChildQtyBase) : 0;

    return {
      recipeId: recipe.id,
      parentMaterialId: parent.id,
      parentMaterialName: parent.name,
      parentAvailableQtyBase,
      piecesPerParentSheet,
      requiredParentQtyBase,
      expectedChildQtyBase,
      surplusChildQtyBase,
      canFulfill,

      parentWidthCm,
      parentHeightCm,
      childWidthCm,
      childHeightCm,

      parentAreaCm2,
      childAreaCm2,
      totalParentAreaUsedCm2,
      requiredChildAreaCm2,
      expectedChildAreaCm2,
      trimWasteAreaPerParentCm2,
      totalTrimWasteAreaCm2,
      trimWasteRate,

      parentCostPerSheet,
      totalParentCost,
      costPerExpectedChildSheet,
      costPerRequiredChildSheet,
      hasCostData,

      priority: recipe.priority,
      isPreferred: recipe.isPreferred,
      cuttingLayoutNote: recipe.cuttingLayoutNote,
      optimizationBadges: [] as string[],
    };
  });

  // Ranking
  const sortedOptions = [...parentOptions].sort((a, b) => {
    if (a.canFulfill !== b.canFulfill) return a.canFulfill ? -1 : 1;
    
    if (optimizationMode === 'LOWEST_COST') {
      if (a.hasCostData !== b.hasCostData) return a.hasCostData ? -1 : 1;
      if (a.hasCostData && a.totalParentCost !== b.totalParentCost) return a.totalParentCost - b.totalParentCost;
      if (a.totalTrimWasteAreaCm2 !== b.totalTrimWasteAreaCm2) return a.totalTrimWasteAreaCm2 - b.totalTrimWasteAreaCm2;
      if (a.surplusChildQtyBase !== b.surplusChildQtyBase) return a.surplusChildQtyBase - b.surplusChildQtyBase;
      if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
      return a.priority - b.priority;
    } 
    else if (optimizationMode === 'LOWEST_TRIM_WASTE') {
      if (a.totalTrimWasteAreaCm2 !== b.totalTrimWasteAreaCm2) return a.totalTrimWasteAreaCm2 - b.totalTrimWasteAreaCm2;
      if (a.hasCostData && b.hasCostData && a.totalParentCost !== b.totalParentCost) return a.totalParentCost - b.totalParentCost;
      if (a.surplusChildQtyBase !== b.surplusChildQtyBase) return a.surplusChildQtyBase - b.surplusChildQtyBase;
      if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
      return a.priority - b.priority;
    }
    else if (optimizationMode === 'LOWEST_SURPLUS') {
      if (a.surplusChildQtyBase !== b.surplusChildQtyBase) return a.surplusChildQtyBase - b.surplusChildQtyBase;
      if (a.hasCostData && b.hasCostData && a.totalParentCost !== b.totalParentCost) return a.totalParentCost - b.totalParentCost;
      if (a.totalTrimWasteAreaCm2 !== b.totalTrimWasteAreaCm2) return a.totalTrimWasteAreaCm2 - b.totalTrimWasteAreaCm2;
      if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
      return a.priority - b.priority;
    }
    // PREFERRED_RECIPE or fallback
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.hasCostData && b.hasCostData && a.totalParentCost !== b.totalParentCost) return a.totalParentCost - b.totalParentCost;
    return a.totalTrimWasteAreaCm2 - b.totalTrimWasteAreaCm2;
  });

  // Assign Badges
  if (sortedOptions.length > 0) {
    const fulfillableOptions = sortedOptions.filter(o => o.canFulfill);
    
    if (fulfillableOptions.length > 0) {
      const lowestCost = Math.min(...fulfillableOptions.filter(o => o.hasCostData).map(o => o.totalParentCost));
      const lowestTrimWaste = Math.min(...fulfillableOptions.map(o => o.totalTrimWasteAreaCm2));
      const lowestSurplus = Math.min(...fulfillableOptions.map(o => o.surplusChildQtyBase));
      
      fulfillableOptions.forEach(opt => {
        if (opt.hasCostData && opt.totalParentCost === lowestCost) opt.optimizationBadges.push('LOWEST_COST');
        if (opt.totalTrimWasteAreaCm2 === lowestTrimWaste) opt.optimizationBadges.push('LOWEST_TRIM_WASTE');
        if (opt.surplusChildQtyBase === lowestSurplus) opt.optimizationBadges.push('LOWEST_SURPLUS');
        if (opt.isPreferred) opt.optimizationBadges.push('PREFERRED');
      });
    }

    sortedOptions.forEach(opt => {
      if (!opt.canFulfill) {
        opt.optimizationBadges = ['INSUFFICIENT_STOCK'];
      }
    });
  }

  const anyCanFulfill = sortedOptions.some(opt => opt.canFulfill);
  const status = anyCanFulfill ? 'AVAILABLE_AFTER_CONVERSION' : 'INSUFFICIENT';
  const recommendedParentOption = anyCanFulfill ? sortedOptions.find(opt => opt.canFulfill) : undefined;

  return {
    childMaterialId,
    requiredChildQtyBase,
    availableChildQtyBase,
    shortageChildQtyBase,
    status,
    directCanFulfill: false,
    parentOptions: sortedOptions,
    recommendedParentOption,
  };
}
