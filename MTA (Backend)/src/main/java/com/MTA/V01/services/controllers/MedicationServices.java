package com.MTA.V01.services.controllers;


import com.MTA.V01.models.Medicine;
import com.MTA.V01.models.enumerationClasses.Effects;
import com.MTA.V01.models.enumerationClasses.IngestionMethod;
import com.MTA.V01.models.enumerationClasses.Restriction;
import com.MTA.V01.models.enumerationClasses.SideEffect;
import com.MTA.V01.models.enumerations.EEffects;
import com.MTA.V01.models.enumerations.EIngestionMethod;
import com.MTA.V01.models.enumerations.ERestrictions;
import com.MTA.V01.models.enumerations.ESideEffects;
import com.MTA.V01.payload.requests.AddMedicineRequest;
import com.MTA.V01.repositories.MedicineRepository;
import com.MTA.V01.repositories.enumRepos.EffectsRepository;
import com.MTA.V01.repositories.enumRepos.IngestionMethodRepository;
import com.MTA.V01.repositories.enumRepos.RestrictionRepository;
import com.MTA.V01.repositories.enumRepos.SideEffectRepository;
import com.MTA.V01.services.general.GeneralServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

//TODO make sure to make an if(exists) and remove the runtime exception with a .get

@Service
public class MedicationServices {
    @Autowired
    MedicineRepository medicineRepository;

    @Autowired
    EffectsRepository effectsRepository;

    @Autowired
    SideEffectRepository sideEffectRepository;

    @Autowired
    RestrictionRepository restrictionRepository;

    @Autowired
    IngestionMethodRepository ingestionMethodRepository;

    @Autowired
    GeneralServices generalServices;

    @Autowired
    LogServices logServices;

    public ResponseEntity<?> addMedication(AddMedicineRequest addMedicineRequest){


        Medicine medicine = new Medicine(addMedicineRequest.getName(),addMedicineRequest.getIsProtected());

        Set<Effects> effects = new HashSet<>();
        {
            addMedicineRequest.getEffects().forEach(effect -> {
                effects.add(
                        effectsRepository.findByName(EEffects.valueOf(effect)).orElseThrow(() -> new RuntimeException("Effect " + effect + " doesn't exist"))
                );
            });
        }

        Set<SideEffect> sideEffects = new HashSet<>();
        {
            addMedicineRequest.getSideEffects().forEach(sideEffect ->{
                sideEffects.add(
                        sideEffectRepository.findByName(ESideEffects.valueOf(sideEffect)).orElseThrow(()-> new RuntimeException("side effect "+sideEffect+" not found"))
                );
            });
        }

        Set<Restriction> restrictions = new HashSet<>();
        {
            addMedicineRequest.getRestrictions().forEach(restriction ->{
                restrictions.add(
                        restrictionRepository.findByName(ERestrictions.valueOf(restriction)).orElseThrow(()->new RuntimeException("restriction "+restriction+" not found"))
                );
            });
        }

        Set<IngestionMethod> ingestionMethods = new HashSet<>();
        {
            addMedicineRequest.getIngestionMethods().forEach(method -> {
                ingestionMethods.add(
                        ingestionMethodRepository.findByName(EIngestionMethod.valueOf(method)).orElseThrow(() -> new RuntimeException("ingestion method "+ method+" not found"))
                );
            });
        }

        medicine.setEffects(effects);
        medicine.setSideEffects(sideEffects);
        medicine.setRestrictions(restrictions);
        medicine.setIngestionMethods(ingestionMethods);
        medicine.setIsCustom(addMedicineRequest.getIsCustom());
        medicine.setUser(generalServices.getSelf());

        logServices.addLog("Medication "+medicine+" has been added by user"+generalServices.getSelf());
        medicineRepository.save(medicine);
        return ResponseEntity.ok("Successfully added medication");
    }

    public ResponseEntity<?> updateMedication(Long id, AddMedicineRequest addMedicineRequest){
        if(!medicineRepository.existsById(id)){
            return ResponseEntity.badRequest().body("medication with the id "+id+" does not exist");
        }


        Medicine medicine = new Medicine(addMedicineRequest.getName(),addMedicineRequest.getIsProtected());

        Set<Effects> effects = new HashSet<>();
        {
            addMedicineRequest.getEffects().forEach(effect -> {
                effects.add(
                        effectsRepository.findByName(EEffects.valueOf(effect)).orElseThrow(() -> new RuntimeException("Effect " + effect + " doesn't exist"))
                );
            });
        }

        Set<SideEffect> sideEffects = new HashSet<>();
        {
            addMedicineRequest.getSideEffects().forEach(sideEffect ->{
                sideEffects.add(
                        sideEffectRepository.findByName(ESideEffects.valueOf(sideEffect)).orElseThrow(()-> new RuntimeException("side effect "+sideEffect+" not found"))
                );
            });
        }

        Set<Restriction> restrictions = new HashSet<>();
        {
            addMedicineRequest.getRestrictions().forEach(restriction ->{
                restrictions.add(
                        restrictionRepository.findByName(ERestrictions.valueOf(restriction)).orElseThrow(()->new RuntimeException("restriction "+restriction+" not found"))
                );
            });
        }

        Set<IngestionMethod> ingestionMethods = new HashSet<>();
        {
            addMedicineRequest.getIngestionMethods().forEach(method -> {
                ingestionMethods.add(
                        ingestionMethodRepository.findByName(EIngestionMethod.valueOf(method)).orElseThrow(() -> new RuntimeException("ingestion method "+ method+" not found"))
                );
            });
        }

        medicine.setEffects(effects);
        medicine.setSideEffects(sideEffects);
        medicine.setRestrictions(restrictions);
        medicine.setIngestionMethods(ingestionMethods);
        medicine.setIsCustom(addMedicineRequest.getIsCustom());
        medicine.setId(id);

        logServices.updateLog("medication "+medicine+" has been updated by user "+generalServices.getSelf());
        medicineRepository.save(medicine);
        return ResponseEntity.ok().body("Medicine successfully updated");
    }

    public ResponseEntity<?> getMedicineById(Long id){
        if(!medicineRepository.existsById(id)){
            return ResponseEntity.badRequest().body("No medication exists with the id of "+id);
        }
        return ResponseEntity.ok().body(medicineRepository.findById(id).get());
    }

    public ResponseEntity<?> deleteMedicationById(Long id){
        if(!medicineRepository.existsById(id)){
            return ResponseEntity.badRequest().body("No medication exists with the id of "+id);
        }
        logServices.deleteLog("medication "+medicineRepository.findById(id)+" has been deleted by user "+generalServices.getSelf());
        medicineRepository.deleteById(id);
        return ResponseEntity.ok().body("Successfully deleted");
    }

    public ResponseEntity<?> SearchByName(String name){
        return ResponseEntity.ok().body(medicineRepository.findByNameContainsIgnoreCaseAndIsCustomFalse(name));
    }

    public ResponseEntity<?> getAllMedication(){
        return ResponseEntity.ok(medicineRepository.findAll());
    }

    public ResponseEntity<?> addUserCustomMedication(AddMedicineRequest addMedicineRequest){

        Medicine medicine = new Medicine(addMedicineRequest.getName(),false);

        Set<Effects> effects = new HashSet<>();
        {
            addMedicineRequest.getEffects().forEach(effect -> {
                effects.add(
                        effectsRepository.findByName(EEffects.valueOf(effect)).orElseThrow(() -> new RuntimeException("Effect " + effect + " doesn't exist"))
                );
            });
        }

        Set<SideEffect> sideEffects = new HashSet<>();
        {
            addMedicineRequest.getSideEffects().forEach(sideEffect ->{
                sideEffects.add(
                        sideEffectRepository.findByName(ESideEffects.valueOf(sideEffect)).orElseThrow(()-> new RuntimeException("side effect "+sideEffect+" not found"))
                );
            });
        }

        Set<Restriction> restrictions = new HashSet<>();
        {
            addMedicineRequest.getRestrictions().forEach(restriction ->{
                restrictions.add(
                        restrictionRepository.findByName(ERestrictions.valueOf(restriction)).orElseThrow(()->new RuntimeException("restriction "+restriction+" not found"))
                );
            });
        }

        Set<IngestionMethod> ingestionMethods = new HashSet<>();
        {
            addMedicineRequest.getIngestionMethods().forEach(method -> {
                ingestionMethods.add(
                        ingestionMethodRepository.findByName(EIngestionMethod.valueOf(method)).orElseThrow(() -> new RuntimeException("ingestion method "+ method+" not found"))
                );
            });
        }

        medicine.setEffects(effects);
        medicine.setSideEffects(sideEffects);
        medicine.setRestrictions(restrictions);
        medicine.setIngestionMethods(ingestionMethods);
        medicine.setIsCustom(true);
        medicine.setUser(generalServices.getSelf());

        logServices.addLog("Medication "+medicine+" has been added by user"+generalServices.getSelf());
        medicineRepository.save(medicine);
        return ResponseEntity.ok("Successfully added medication");

    }

    public ResponseEntity<?> getUserCustomMedication(){
        if (generalServices.getSelf().getMedicine().isEmpty()){
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(generalServices.getSelf().getMedicine());
    }
}
