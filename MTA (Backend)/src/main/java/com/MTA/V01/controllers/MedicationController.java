package com.MTA.V01.controllers;

import com.MTA.V01.payload.requests.AddMedicineRequest;
import com.MTA.V01.services.controllers.MedicationServices;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"},maxAge = 3600)
@RequestMapping("/api/medication")
public class MedicationController {

    @Autowired
    MedicationServices medicationServices;

    @PostMapping("/addMedication")
    public ResponseEntity<?> addMedication(@Valid @RequestBody AddMedicineRequest addMedicineRequest){
        return medicationServices.addMedication(addMedicineRequest);
    }

    @PutMapping("/updateMedication/{id}")
    public ResponseEntity<?> updateMedication(@PathVariable("id") Long id, @Valid @RequestBody AddMedicineRequest addMedicineRequest){
        return medicationServices.updateMedication(id,addMedicineRequest);
    }

    @GetMapping("/getMedicationById/{id}")
    public ResponseEntity<?> getMedicationById(@PathVariable("id") Long id){
        return medicationServices.getMedicineById(id);
    }

    @DeleteMapping("/deleteMedication/{id}")
    public ResponseEntity<?> deleteMedication(@PathVariable("id") Long id){
        return medicationServices.deleteMedicationById(id);
    }

    @GetMapping("/searchMedicationByName/{name}")
    public ResponseEntity<?> search(@PathVariable("name") String name){
        return  medicationServices.SearchByName(name);
    }

    @GetMapping("/findall")
    public ResponseEntity<?> findAll(){
        return medicationServices.getAllMedication();
    }

    @PostMapping("/custom/add")
    public ResponseEntity<?> addUserCustomMedication(@RequestBody @Valid AddMedicineRequest addMedicineRequest){
        return medicationServices.addUserCustomMedication(addMedicineRequest);
    }

    @GetMapping("/self/findall")
    public ResponseEntity<?> getUserCustomMedication(){
        return medicationServices.getUserCustomMedication();
    }
}
