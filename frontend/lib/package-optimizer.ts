/**
 * Package Combination Optimizer
 * Implements algorithms to find optimal package combinations
 * to fulfill a prescription with minimal overfill
 */

import { NDCPackage } from '@/types/api';
import { PackageRecommendation } from '@/types/workflow';

const MAX_PACKAGES = 3; // Maximum number of different packages in a combination
const MAX_COMBINATIONS_TO_EVALUATE = 100; // Limit for performance

/**
 * Calculate overfill percentage for a package combination
 */
function calculateOverfill(
  totalDispensed: number,
  totalNeeded: number
): number {
  if (totalNeeded === 0) return 0;
  const overfill = totalDispensed - totalNeeded;
  return (overfill / totalNeeded) * 100;
}

/**
 * Generate all possible combinations of packages
 * Uses dynamic programming / knapsack approach
 */
function generateCombinations(
  packages: NDCPackage[],
  targetQuantity: number
): Array<{
  packages: Array<{ package: NDCPackage; count: number }>;
  totalQuantity: number;
}> {
  const combinations: Array<{
    packages: Array<{ package: NDCPackage; count: number }>;
    totalQuantity: number;
  }> = [];
  
  // Sort packages by size (descending) for greedy approach
  const sortedPackages = [...packages].sort((a, b) => {
    const sizeA = a.packageSize?.quantity || 0;
    const sizeB = b.packageSize?.quantity || 0;
    return sizeB - sizeA;
  });
  
  // Try single package combinations
  sortedPackages.forEach(pkg => {
    const packageSize = pkg.packageSize?.quantity || 0;
    if (packageSize > 0) {
      const count = Math.ceil(targetQuantity / packageSize);
      if (count <= 10) { // Reasonable limit
        combinations.push({
          packages: [{ package: pkg, count }],
          totalQuantity: count * packageSize,
        });
      }
    }
  });
  
  // Try two-package combinations
  if (MAX_PACKAGES >= 2) {
    for (let i = 0; i < sortedPackages.length && i < 10; i++) {
      for (let j = i + 1; j < sortedPackages.length && j < 10; j++) {
        const pkg1 = sortedPackages[i];
        const pkg2 = sortedPackages[j];
        const size1 = pkg1.packageSize?.quantity || 0;
        const size2 = pkg2.packageSize?.quantity || 0;
        
        if (size1 > 0 && size2 > 0) {
          // Try different counts of each package
          for (let count1 = 0; count1 <= 5; count1++) {
            for (let count2 = 0; count2 <= 5; count2++) {
              if (count1 === 0 && count2 === 0) continue;
              
              const total = count1 * size1 + count2 * size2;
              if (total >= targetQuantity && total <= targetQuantity * 1.5) {
                const pkgs = [];
                if (count1 > 0) pkgs.push({ package: pkg1, count: count1 });
                if (count2 > 0) pkgs.push({ package: pkg2, count: count2 });
                
                combinations.push({
                  packages: pkgs,
                  totalQuantity: total,
                });
              }
            }
          }
        }
      }
    }
  }
  
  // Try three-package combinations (limited to avoid explosion)
  if (MAX_PACKAGES >= 3 && sortedPackages.length >= 3) {
    for (let i = 0; i < Math.min(5, sortedPackages.length); i++) {
      for (let j = i + 1; j < Math.min(6, sortedPackages.length); j++) {
        for (let k = j + 1; k < Math.min(7, sortedPackages.length); k++) {
          const pkg1 = sortedPackages[i];
          const pkg2 = sortedPackages[j];
          const pkg3 = sortedPackages[k];
          const size1 = pkg1.packageSize?.quantity || 0;
          const size2 = pkg2.packageSize?.quantity || 0;
          const size3 = pkg3.packageSize?.quantity || 0;
          
          if (size1 > 0 && size2 > 0 && size3 > 0) {
            // Try limited counts to avoid explosion
            for (let count1 = 0; count1 <= 3; count1++) {
              for (let count2 = 0; count2 <= 3; count2++) {
                for (let count3 = 0; count3 <= 3; count3++) {
                  if (count1 === 0 && count2 === 0 && count3 === 0) continue;
                  
                  const total = count1 * size1 + count2 * size2 + count3 * size3;
                  if (total >= targetQuantity && total <= targetQuantity * 1.5) {
                    const pkgs = [];
                    if (count1 > 0) pkgs.push({ package: pkg1, count: count1 });
                    if (count2 > 0) pkgs.push({ package: pkg2, count: count2 });
                    if (count3 > 0) pkgs.push({ package: pkg3, count: count3 });
                    
                    combinations.push({
                      packages: pkgs,
                      totalQuantity: total,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Remove duplicates and limit
  const uniqueCombinations = combinations
    .filter((combo, index, self) => {
      // Remove combinations with same total and same packages
      return index === self.findIndex(c => 
        c.totalQuantity === combo.totalQuantity &&
        c.packages.length === combo.packages.length &&
        c.packages.every((p, i) => 
          combo.packages[i]?.package.ndc === p.package.ndc &&
          combo.packages[i]?.count === p.count
        )
      );
    })
    .slice(0, MAX_COMBINATIONS_TO_EVALUATE);
  
  return uniqueCombinations;
}

/**
 * Score a package combination
 * Lower score = better (less overfill, fewer packages)
 */
function scoreCombination(
  combo: {
    packages: Array<{ package: NDCPackage; count: number }>;
    totalQuantity: number;
  },
  targetQuantity: number
): number {
  const overfill = combo.totalQuantity - targetQuantity;
  const overfillPercent = (overfill / targetQuantity) * 100;
  const totalPackages = combo.packages.reduce((sum, p) => sum + p.count, 0);
  
  // Scoring: prioritize minimal overfill, then fewer packages
  let score = overfillPercent * 10; // Overfill penalty
  score += totalPackages * 5; // Package count penalty
  score += combo.packages.length * 2; // Different package types penalty
  
  return score;
}

/**
 * Generate reasoning text for a recommendation
 */
function generateReasoning(
  combo: {
    packages: Array<{ package: NDCPackage; count: number }>;
    totalQuantity: number;
  },
  targetQuantity: number
): string {
  const overfill = combo.totalQuantity - targetQuantity;
  const overfillPercent = ((overfill / targetQuantity) * 100).toFixed(1);
  const totalPackages = combo.packages.reduce((sum, p) => sum + p.count, 0);
  
  if (overfill === 0) {
    return `Perfect match: Dispenses exactly ${targetQuantity} units with ${totalPackages} package(s)`;
  } else if (parseFloat(overfillPercent) < 5) {
    return `Minimal overfill: Only ${overfillPercent}% (${overfill} units) extra with ${totalPackages} package(s)`;
  } else if (parseFloat(overfillPercent) < 15) {
    return `Low overfill: ${overfillPercent}% (${overfill} units) extra with ${totalPackages} package(s)`;
  } else {
    return `Moderate overfill: ${overfillPercent}% (${overfill} units) extra with ${totalPackages} package(s)`;
  }
}

/**
 * Find optimal package combinations for a target quantity
 */
export function findOptimalPackageCombinations(
  packages: NDCPackage[],
  targetQuantity: number,
  unit: string = 'units'
): PackageRecommendation[] {
  if (!packages || packages.length === 0 || targetQuantity <= 0) {
    return [];
  }
  
  // Filter packages with valid sizes
  const validPackages = packages.filter(pkg => {
    const size = pkg.packageSize?.quantity || 0;
    return size > 0 && size <= targetQuantity * 2; // Reasonable size limit
  });
  
  if (validPackages.length === 0) {
    return [];
  }
  
  // Generate all possible combinations
  const combinations = generateCombinations(validPackages, targetQuantity);
  
  // Score and sort combinations
  const scoredCombinations = combinations
    .map(combo => ({
      combo,
      score: scoreCombination(combo, targetQuantity),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5); // Return top 5 recommendations
  
  // Convert to PackageRecommendation format
  const recommendations: PackageRecommendation[] = scoredCombinations.map((scored, index) => {
    const { combo } = scored;
    const overfillPercent = calculateOverfill(combo.totalQuantity, targetQuantity);
    const totalPackages = combo.packages.reduce((sum, p) => sum + p.count, 0);
    
    return {
      id: `rec_${Date.now()}_${index}`,
      packages: combo.packages.map(p => ({
        package: p.package,
        quantity: (p.package.packageSize?.quantity || 0) * p.count,
        packagesNeeded: p.count,
      })),
      totalQuantity: combo.totalQuantity,
      totalPackages,
      overfillPercentage: overfillPercent,
      score: 100 - scored.score, // Invert for display (higher = better)
      reasoning: generateReasoning(combo, targetQuantity),
    };
  });
  
  return recommendations;
}

/**
 * Find the single best package (for single-package mode)
 */
export function findBestSinglePackage(
  packages: NDCPackage[],
  targetQuantity: number
): NDCPackage | null {
  const recommendations = findOptimalPackageCombinations(packages, targetQuantity);
  
  // Find first recommendation with only one package type
  const singlePackageRec = recommendations.find(rec => rec.packages.length === 1);
  
  return singlePackageRec?.packages[0]?.package || null;
}

/**
 * Validate that selected packages meet the required quantity
 */
export function validatePackageSelection(
  selectedPackages: Array<{ package: NDCPackage; count: number }>,
  targetQuantity: number
): {
  isValid: boolean;
  totalQuantity: number;
  message?: string;
} {
  if (!selectedPackages || selectedPackages.length === 0) {
    return {
      isValid: false,
      totalQuantity: 0,
      message: 'No packages selected',
    };
  }
  
  const totalQuantity = selectedPackages.reduce((sum, p) => {
    const packageSize = p.package.packageSize?.quantity || 0;
    return sum + packageSize * p.count;
  }, 0);
  
  if (totalQuantity < targetQuantity) {
    const shortage = targetQuantity - totalQuantity;
    return {
      isValid: false,
      totalQuantity,
      message: `Selected packages provide ${totalQuantity} units, but ${targetQuantity} units are needed (${shortage} units short)`,
    };
  }
  
  return {
    isValid: true,
    totalQuantity,
  };
}

