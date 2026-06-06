package com.MTA.V01.controllers;

import com.MTA.V01.payload.requests.AddDoseRequest;
import com.MTA.V01.payload.requests.EditDoseRequest;
import com.MTA.V01.services.controllers.DoseServices;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/api/dose")
public class DoseController {
    @Autowired
    DoseServices doseServices;

    @PostMapping("/add")
    public ResponseEntity<?> addDose(@Valid @RequestBody AddDoseRequest addDoseRequest){
        return doseServices.addDose(addDoseRequest);
    }

    @PostMapping("/edit/{id}")
    public ResponseEntity<?> editDose(@PathVariable("id")Long doseId, EditDoseRequest editDoseRequest){
        return doseServices.editDose(doseId,editDoseRequest);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteDose(@PathVariable("id") Long doseId){
        return doseServices.deleteDose(doseId);
    }

    @DeleteMapping("/massdelete/{name}")
    public ResponseEntity<?> massDelete(@PathVariable("name") String doseName){
        return doseServices.massDeleteDoses(doseName);
    }

    @GetMapping("/getall")
    public ResponseEntity<?> getAll(){
        return doseServices.findAllDoses();
    }

    @GetMapping("getactive")
    public ResponseEntity<?> getActiveDoses(){
        return doseServices.findAllActiveDoses();
    }

    @GetMapping("/search/{term}")
    public ResponseEntity<?> search(@PathVariable("term") String doseName){
        return doseServices.search(doseName);
    }

    @GetMapping("/take/{id}")
    public ResponseEntity<?> takeDose(@PathVariable("id") Long doseId){
        return doseServices.takeDose(doseId);
    }

    @GetMapping("/skip/{id}")
    public ResponseEntity<?> skipDose(@PathVariable("id") Long doseId){
        return doseServices.skipDose(doseId);
    }

    @GetMapping("/findbyid/{doseId}")
    public ResponseEntity<?> findDoseById(@PathVariable("doseId") Long doseId){
        return doseServices.findDoseById(doseId);
    }

    @GetMapping("deactivate/{doseSimpleId}")
    public ResponseEntity<?> deactivateDose(@PathVariable("doseSimpleId") String id){
        return doseServices.deactivateDose(id);
    }

    @GetMapping("/hard/taken/{doseId}")
    public ResponseEntity<?> takeDose(@PathVariable("doseId") long id){
        return doseServices.take(id);
    }
    @GetMapping("/hard/takeearly/{doseId}")
    public ResponseEntity<?> takeEarlyDose(@PathVariable("doseId") long id){
        return doseServices.takeEarly(id);
    }
    @GetMapping("/hard/takelate/{doseId}")
    public ResponseEntity<?> takeLateDose(@PathVariable("doseId") long id){
        return doseServices.takeLate(id);
    }
    @GetMapping("/hard/overdose/{doseId}")
    public ResponseEntity<?> overdose(@PathVariable("doseId") long id){
        return doseServices.overdosed(id);
    }
    @GetMapping("/miss/{doseId}")
    public ResponseEntity<?> miss(@PathVariable("doseId") long id){
        return doseServices.miss(id);
    }
}
