import { db } from './db';

export async function findParentMaterialFulfillment(input: {
  childMaterialId: string;
  requiredChildQtyBase: number;
  orderId?: string;
  productionJobId?: string;
}) {
  const { childMaterialId, requiredChildQtyBase } = input;

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

  if (recipes.length === 0) {
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

  const parentOptions = recipes.map((recipe) => {
    const parent = recipe.fromMaterial;
    const parentAvailableQtyBase = parent.currentStockBase - parent.reservedStockBase;
    const piecesPerParentSheet = recipe.piecesPerParentSheet;

    const requiredParentQtyBase = Math.ceil(shortageChildQtyBase / piecesPerParentSheet);
    const expectedChildQtyBase = requiredParentQtyBase * piecesPerParentSheet;
    const wasteChildQtyBase = expectedChildQtyBase - shortageChildQtyBase;
    
    const canFulfill = parentAvailableQtyBase >= requiredParentQtyBase;

    return {
      recipeId: recipe.id,
      parentMaterialId: parent.id,
      parentMaterialName: parent.name,
      parentAvailableQtyBase,
      piecesPerParentSheet,
      requiredParentQtyBase,
      expectedChildQtyBase,
      canFulfill,
      wasteChildQtyBase,
      note: `1 tờ ${parent.name} -> ${piecesPerParentSheet} tờ ${childMaterial.name}`,
    };
  });

  const validOptions = parentOptions.filter((opt) => opt.canFulfill);

  let status = 'INSUFFICIENT';
  let recommendedParentOption = undefined;

  if (validOptions.length > 0) {
    status = 'AVAILABLE_AFTER_CONVERSION';
    // Recommend option with minimum waste
    recommendedParentOption = validOptions.reduce((prev, current) => 
      (prev.wasteChildQtyBase < current.wasteChildQtyBase) ? prev : current
    );
  }

  return {
    childMaterialId,
    requiredChildQtyBase,
    availableChildQtyBase,
    shortageChildQtyBase,
    status,
    directCanFulfill: false,
    parentOptions,
    recommendedParentOption,
  };
}
